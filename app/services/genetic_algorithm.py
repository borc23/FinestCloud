import logging
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
from shapely import prepare
from shapely.affinity import rotate as shapely_rotate
from shapely.geometry import Polygon, box
from shapely.strtree import STRtree


@dataclass
class OptimizationMetrics:
    total_time_seconds: float = 0.0
    generations_completed: int = 0
    early_stopped: bool = False
    best_fitness: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    average_population_similarity: float = 0.0
    convergence_rate: float = 0.0


class PanelGeneticOptimizer:
    def __init__(
        self,
        population_size: int = 22,
        generations: int = 9,
        tournament_size: int = 3,
        crossover_rate: float = 0.85,
        mutation_rate: float = 0.15,
        elitism_count: int = 2,
        early_stop_threshold: int = 3,
    ):
        self.population_size = population_size
        self.generations = generations
        self.tournament_size = tournament_size
        self.crossover_rate = crossover_rate
        self.mutation_rate = mutation_rate
        self.elitism_count = elitism_count
        self.early_stop_threshold = early_stop_threshold
        self.fitness_cache: Dict[Tuple, Tuple[int, List]] = {}
        self.previous_best_fitness = 0
        self.metrics = OptimizationMetrics()

        self.fitness_history: List[float] = []
        self.convergence_window = 5

        self.logger = logging.getLogger(__name__)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            self.logger.propagate = False

    def _quantize_chromosome(
        self, chromosome: Tuple[float, float, int, float, float, float]
    ) -> Tuple[int, int, int, int, int, int]:
        (
            offset_x,
            offset_y,
            orientation,
            spacing_x_mult,
            spacing_y_mult,
            stagger,
        ) = chromosome
        return (
            int(offset_x * 2),  # 0.5cm precision -> integer
            int(offset_y * 2),
            orientation,
            int(spacing_x_mult * 100),  # 0.01 precision -> integer
            int(spacing_y_mult * 100),
            int(stagger * 100),
        )

    def optimize_panel_placement(
        self,
        roof_polygon: np.ndarray,
        objects: List[Dict],
        vertical_dims: Tuple[float, float],
        horizontal_dims: Tuple[float, float],
        spacing_cm: float,
        angle: float,
        padding_cm: float,
        gps_system=None,
        tune_parameters: bool = False,
        panel_orientation: str = "best",
    ) -> List[np.ndarray]:
        start_time = time.time()
        self.metrics = OptimizationMetrics()

        global_best_solution: Optional[List[np.ndarray]] = None
        global_best_fitness = 0

        # Convert objects from GPS to cm if gps_system is provided
        object_polys: List[Polygon] = []
        if gps_system:
            for obj in objects:
                obj_coords = obj.get("coords", obj) if isinstance(obj, dict) else obj
                obj_coords_cm = gps_system.gps_array_to_cm(obj_coords)
                if len(obj_coords_cm) > 2:
                    object_polys.append(Polygon(obj_coords_cm))

        roof_poly = Polygon(roof_polygon)

        # Get bounds for the roof
        min_x, min_y = roof_polygon.min(axis=0)
        max_x, max_y = roof_polygon.max(axis=0)

        # Calculate center for rotation
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2

        if tune_parameters:
            self._tune_genetic_parameters()

        self.fitness_cache = {}
        self.previous_best_fitness = 0
        self.fitness_history = []
        stagnation_counter = 0

        try:
            # Rotate roof and objects
            angle_degrees = -np.degrees(angle)
            rotated_roof = shapely_rotate(
                roof_poly, angle_degrees, origin=(center_x, center_y)
            )

            prepare(rotated_roof)

            rotated_objects = [
                shapely_rotate(obj, angle_degrees, origin=(center_x, center_y))
                for obj in object_polys
            ]

            # This changes obstacle intersection from O(n) to O(log n)
            obstacle_tree: Optional[STRtree] = None
            if rotated_objects:
                obstacle_tree = STRtree(rotated_objects)

            # Get rotated bounds
            rot_min_x, rot_min_y, rot_max_x, rot_max_y = rotated_roof.bounds

            angle_rad = np.radians(-angle_degrees)
            cos_a, sin_a = np.cos(angle_rad), np.sin(angle_rad)
            rotation_matrix = np.array([[cos_a, -sin_a], [sin_a, cos_a]])

            # Store context for grid generation
            grid_context = {
                "rotated_roof": rotated_roof,
                "obstacle_tree": obstacle_tree,
                "rot_bounds": (rot_min_x, rot_min_y, rot_max_x, rot_max_y),
                "rotation_matrix": rotation_matrix,
                "center": (center_x, center_y),
                "padding_cm": padding_cm,
            }

            for _ in range(5):
                population = self._initialize_population(spacing_cm, panel_orientation)
                best_fitness = 0

                fitness_scores = np.zeros(self.population_size, dtype=np.int32)

                for generation in range(self.generations):
                    solutions: List[List[np.ndarray]] = []

                    for i, chromosome in enumerate(population):
                        cache_key = self._quantize_chromosome(chromosome)

                        if cache_key in self.fitness_cache:
                            fitness, panels = self.fitness_cache[cache_key]
                            self.metrics.cache_hits += 1
                        else:
                            try:
                                is_vertical = chromosome[2] == 0
                                dims = vertical_dims if is_vertical else horizontal_dims

                                panels = self._generate_grid_optimized(
                                    chromosome=chromosome,
                                    panel_dims=dims,
                                    spacing_cm=spacing_cm,
                                    context=grid_context,
                                )

                                fitness = len(panels)
                                self.fitness_cache[cache_key] = (fitness, panels)
                                self.metrics.cache_misses += 1
                            except Exception as e:
                                self.logger.error(f"Error generating grid: {e}")
                                fitness = 0
                                panels = []

                        fitness_scores[i] = fitness
                        solutions.append(panels)

                        if fitness > best_fitness:
                            best_fitness = fitness

                        if fitness > global_best_fitness:
                            global_best_fitness = fitness
                            global_best_solution = panels

                    current_max_fitness = int(fitness_scores.max())
                    self.fitness_history.append(current_max_fitness)

                    # Early stopping check
                    if generation > 0:
                        if current_max_fitness == self.previous_best_fitness:
                            stagnation_counter += 1
                            if stagnation_counter >= self.early_stop_threshold:
                                self.metrics.early_stopped = True
                                break
                        else:
                            stagnation_counter = 0

                    self.previous_best_fitness = current_max_fitness

                    population = self._create_new_population_optimized(
                        population, fitness_scores, spacing_cm, panel_orientation
                    )

            self.metrics.generations_completed = generation + 1
            self.metrics.best_fitness = global_best_fitness
            self.metrics.total_time_seconds = time.time() - start_time

            self.logger.info(
                f"Optimization completed in {self.metrics.total_time_seconds:.2f}s. "
                f"Best solution: {global_best_fitness} panels"
            )

            return global_best_solution or []

        except Exception as e:
            self.logger.error(f"Error in optimization: {str(e)}", exc_info=True)
            self.metrics.total_time_seconds = time.time() - start_time
            return []

    def _generate_grid_optimized(
        self,
        chromosome: Tuple[float, float, int, float, float, float],
        panel_dims: Tuple[float, float],
        spacing_cm: float,
        context: dict,
    ) -> List[np.ndarray]:
        (
            offset_x,
            offset_y,
            _,
            spacing_x_mult,
            spacing_y_mult,
            stagger_offset,
        ) = chromosome
        panel_width_cm, panel_height_cm = panel_dims

        rotated_roof = context["rotated_roof"]
        obstacle_tree: Optional[STRtree] = context["obstacle_tree"]
        rot_min_x, rot_min_y, rot_max_x, rot_max_y = context["rot_bounds"]
        rotation_matrix = context["rotation_matrix"]
        center_x, center_y = context["center"]
        padding_cm = context["padding_cm"]

        actual_spacing_x = spacing_cm * spacing_x_mult
        actual_spacing_y = spacing_cm * spacing_y_mult

        step_x = panel_width_cm + actual_spacing_x
        step_y = panel_height_cm + actual_spacing_y

        stagger_displacement = panel_width_cm * stagger_offset

        panels: List[np.ndarray] = []

        y_start = rot_min_y + padding_cm + offset_y
        y_end = rot_max_y - padding_cm - panel_height_cm
        x_start_base = rot_min_x + padding_cm + offset_x
        x_end = rot_max_x - padding_cm - panel_width_cm

        if y_start > y_end or x_start_base > x_end:
            return panels

        # Generate all y positions
        y_positions = np.arange(y_start, y_end + 0.001, step_y)

        for row_idx, y in enumerate(y_positions):
            row_stagger = stagger_displacement if (row_idx % 2 == 1) else 0.0
            x_start = x_start_base + row_stagger

            # Generate all x positions for this row
            x_positions = np.arange(x_start, x_end + 0.001, step_x)

            for x in x_positions:
                # Create panel polygon using box (faster than manual Polygon)
                panel_poly = box(x, y, x + panel_width_cm, y + panel_height_cm)

                # Check containment (uses prepared geometry - much faster)
                if not rotated_roof.contains(panel_poly):
                    continue

                if obstacle_tree is not None:
                    # Query returns indices of potentially intersecting geometries
                    potential_hits = obstacle_tree.query(panel_poly)
                    if any(
                        panel_poly.intersects(obstacle_tree.geometries[idx])
                        for idx in potential_hits
                    ):
                        continue

                corners = np.array(
                    [
                        [x, y],
                        [x + panel_width_cm, y],
                        [x + panel_width_cm, y + panel_height_cm],
                        [x, y + panel_height_cm],
                    ]
                )

                # Translate to origin, rotate, translate back
                centered = corners - np.array([center_x, center_y])
                rotated = centered @ rotation_matrix.T
                final_corners = rotated + np.array([center_x, center_y])

                panels.append(final_corners)

        return panels

    def _initialize_population(
        self,
        spacing: float,
        panel_orientation: str = "best",
    ) -> List[Tuple[float, float, int, float, float, float]]:
        """Initialize a diverse population with enhanced chromosome structure."""
        max_offset = max(50.0, spacing if spacing > 0 else 50.0)
        population: List[Tuple[float, float, int, float, float, float]] = []

        n = self.population_size
        offsets = np.round(np.random.uniform(0, max_offset, (n, 2)) * 2) / 2
        spacing_mults = np.random.uniform(0.5, 2.0, (n, 2))

        if panel_orientation == "vertical":
            orientations = np.zeros(n, dtype=int)
        elif panel_orientation == "horizontal":
            orientations = np.ones(n, dtype=int)
        else:
            orientations = np.random.choice([0, 1], n)

        for i in range(n):
            population.append(
                (
                    offsets[i, 0],
                    offsets[i, 1],
                    int(orientations[i]),
                    spacing_mults[i, 0],
                    spacing_mults[i, 1],
                    0.0,  # No stagger
                )
            )

        return population

    def _create_new_population_optimized(
        self,
        population: List[Tuple[float, float, int, float, float, float]],
        fitness_scores: np.ndarray,
        spacing: float,
        panel_orientation: str = "best",
    ) -> List[Tuple[float, float, int, float, float, float]]:
        new_population: List[Tuple[float, float, int, float, float, float]] = []

        # Elitism with numpy argsort (more efficient for larger arrays)
        if self.elitism_count > 0 and len(fitness_scores) > 0:
            elite_indices = np.argpartition(fitness_scores, -self.elitism_count)[
                -self.elitism_count :
            ]
            for idx in elite_indices:
                new_population.append(population[idx])

        # Pre-compute fitness ranks once (avoid repeated argsort)
        fitness_ranks = np.zeros(len(fitness_scores))
        if len(fitness_scores) > 1:
            sorted_indices = np.argsort(fitness_scores)
            fitness_ranks[sorted_indices] = np.arange(len(fitness_scores)) / (
                len(fitness_scores) - 1
            )

        # Calculate diversity using sampling (already O(sample^2))
        diversity_score = self._calculate_population_diversity_fast(population)
        convergence_rate = self._calculate_convergence_rate()

        self.metrics.average_population_similarity = diversity_score
        self.metrics.convergence_rate = convergence_rate

        diversity_factor = 1.0 - diversity_score
        stagnation_factor = 1.0 - convergence_rate
        adaptive_mutation_rate = min(
            self.mutation_rate * (1.0 + diversity_factor + stagnation_factor), 0.5
        )

        num_needed = self.population_size - len(new_population)
        num_pairs = (num_needed + 1) // 2

        # Pre-generate all random numbers needed
        tournament_indices = np.random.randint(
            0, len(population), (num_pairs * 2, self.tournament_size)
        )
        crossover_randoms = np.random.random(num_pairs)

        pair_idx = 0
        while len(new_population) < self.population_size:
            # Tournament selection using pre-generated indices
            idx1 = tournament_indices[pair_idx * 2]
            idx2 = tournament_indices[pair_idx * 2 + 1]

            tournament_fitness1 = fitness_scores[idx1]
            tournament_fitness2 = fitness_scores[idx2]

            parent1_idx = idx1[np.argmax(tournament_fitness1)]
            parent2_idx = idx2[np.argmax(tournament_fitness2)]

            parent1 = population[parent1_idx]
            parent2 = population[parent2_idx]

            if crossover_randoms[pair_idx] < self.crossover_rate:
                child1, child2 = self._crossover(parent1, parent2, panel_orientation)
            else:
                child1, child2 = parent1, parent2

            child1 = self._mutate(
                child1,
                spacing,
                mutation_rate=adaptive_mutation_rate,
                panel_orientation=panel_orientation,
                fitness_rank=fitness_ranks[parent1_idx],
            )
            child2 = self._mutate(
                child2,
                spacing,
                mutation_rate=adaptive_mutation_rate,
                panel_orientation=panel_orientation,
                fitness_rank=fitness_ranks[parent2_idx],
            )

            new_population.append(child1)
            if len(new_population) < self.population_size:
                new_population.append(child2)

            pair_idx += 1

        return new_population

    def _calculate_population_diversity_fast(
        self,
        population: List[Tuple[float, float, int, float, float, float]],
    ) -> float:
        if len(population) < 2:
            return 0.0

        # Convert to numpy array for vectorized operations
        pop_array = np.array(population)

        normalized = np.zeros_like(pop_array)
        normalized[:, 0] = pop_array[:, 0] / 50.0  # offset_x
        normalized[:, 1] = pop_array[:, 1] / 50.0  # offset_y
        normalized[:, 2] = pop_array[:, 2]  # orientation
        normalized[:, 3] = (pop_array[:, 3] - 0.5) / 1.5  # spacing_x_mult
        normalized[:, 4] = (pop_array[:, 4] - 0.5) / 1.5  # spacing_y_mult
        normalized[:, 5] = pop_array[:, 5]  # stagger

        # Calculate variance across population (measure of diversity)
        variance = np.var(normalized, axis=0)

        # Sum of variances gives diversity score
        # Normalize to 0-1 range (max variance for uniform [0,1] is 0.25)
        diversity = min(np.sum(variance) / 1.5, 1.0)

        return diversity

    def _calculate_convergence_rate(self) -> float:
        """Calculate convergence rate based on fitness improvement."""
        if len(self.fitness_history) < 2:
            return 0.5

        recent_history = self.fitness_history[-self.convergence_window :]

        if len(recent_history) < 2:
            return 0.5

        # Vectorized improvement calculation
        history_array = np.array(recent_history)
        diffs = np.diff(history_array)
        base = history_array[:-1]

        # Avoid division by zero
        valid_mask = base > 0
        if not np.any(valid_mask):
            return 0.0

        improvements = np.abs(diffs[valid_mask] / base[valid_mask])
        avg_improvement = np.mean(improvements)

        return min(avg_improvement * 10, 1.0)

    def _crossover(
        self,
        parent1: Tuple[float, float, int, float, float, float],
        parent2: Tuple[float, float, int, float, float, float],
        panel_orientation: str = "best",
    ) -> Tuple[
        Tuple[float, float, int, float, float, float],
        Tuple[float, float, int, float, float, float],
    ]:
        """Perform crossover between two parents."""
        p1_x, p1_y, p1_orient, p1_sx, p1_sy, _ = parent1
        p2_x, p2_y, p2_orient, p2_sx, p2_sy, _ = parent2

        if np.random.random() < 0.5:
            if panel_orientation == "best":
                child1 = (p1_x, p1_y, p2_orient, p2_sx, p2_sy, 0.0)
                child2 = (p2_x, p2_y, p1_orient, p1_sx, p1_sy, 0.0)
            else:
                child1 = (p1_x, p1_y, p1_orient, p2_sx, p2_sy, 0.0)
                child2 = (p2_x, p2_y, p2_orient, p1_sx, p1_sy, 0.0)
        else:
            alpha = np.random.random()

            child1_x = np.round((alpha * p1_x + (1 - alpha) * p2_x) * 2) / 2
            child1_y = np.round((alpha * p1_y + (1 - alpha) * p2_y) * 2) / 2
            child2_x = np.round(((1 - alpha) * p1_x + alpha * p2_x) * 2) / 2
            child2_y = np.round(((1 - alpha) * p1_y + alpha * p2_y) * 2) / 2

            child1_sx = alpha * p1_sx + (1 - alpha) * p2_sx
            child1_sy = alpha * p1_sy + (1 - alpha) * p2_sy
            child2_sx = (1 - alpha) * p1_sx + alpha * p2_sx
            child2_sy = (1 - alpha) * p1_sy + alpha * p2_sy

            if panel_orientation == "best":
                child1_orient = p1_orient if np.random.random() < 0.5 else p2_orient
                child2_orient = p1_orient if np.random.random() < 0.5 else p2_orient
            else:
                child1_orient = p1_orient
                child2_orient = p2_orient

            child1 = (child1_x, child1_y, child1_orient, child1_sx, child1_sy, 0.0)
            child2 = (child2_x, child2_y, child2_orient, child2_sx, child2_sy, 0.0)

        return child1, child2

    def _mutate(
        self,
        individual: Tuple[float, float, int, float, float, float],
        spacing: float,
        mutation_rate: Optional[float] = None,
        panel_orientation: str = "best",
        fitness_rank: float = 0.5,
    ) -> Tuple[float, float, int, float, float, float]:
        """Mutate an individual with self-adaptive mutation strength."""
        if mutation_rate is None:
            mutation_rate = self.mutation_rate

        offset_x, offset_y, orientation, spacing_x_mult, spacing_y_mult, _ = individual

        rank_factor = 1.0 - fitness_rank
        strength_multiplier = 1.0 + (2.0 * rank_factor)

        # Simplified power law selection
        if fitness_rank < 0.3:
            power_law = np.random.choice([2, 3, 4])
        elif fitness_rank < 0.7:
            power_law = np.random.choice([1, 2, 3])
        else:
            power_law = np.random.choice([1, 2])

        max_offset = max(50.0, spacing if spacing > 0 else 50.0)

        randoms = np.random.random(5)

        if randoms[0] < mutation_rate:
            mutation_steps = np.random.randint(-power_law * 3, power_law * 4 + 1)
            mutation_strength = mutation_steps * 0.5 * strength_multiplier
            offset_x = np.clip(offset_x + mutation_strength, 0, max_offset)
            offset_x = np.round(offset_x * 2) / 2

        if randoms[1] < mutation_rate:
            mutation_steps = np.random.randint(-power_law * 3, power_law * 4 + 1)
            mutation_strength = mutation_steps * 0.5 * strength_multiplier
            offset_y = np.clip(offset_y + mutation_strength, 0, max_offset)
            offset_y = np.round(offset_y * 2) / 2

        if panel_orientation == "best" and randoms[2] < mutation_rate * 0.3:
            orientation = 1 - orientation

        if randoms[3] < mutation_rate:
            spacing_delta = np.random.uniform(-0.3, 0.3) * strength_multiplier
            spacing_x_mult = np.clip(spacing_x_mult + spacing_delta, 0.5, 2.0)

        if randoms[4] < mutation_rate:
            spacing_delta = np.random.uniform(-0.3, 0.3) * strength_multiplier
            spacing_y_mult = np.clip(spacing_y_mult + spacing_delta, 0.5, 2.0)

        return (offset_x, offset_y, orientation, spacing_x_mult, spacing_y_mult, 0.0)

    def _tune_genetic_parameters(self) -> None:
        """Tune genetic algorithm parameters for optimal performance."""
        self.logger.info("Starting genetic algorithm parameter tuning...")

        self.population_size = 26
        self.generations = 12
        self.tournament_size = 4
        self.crossover_rate = 0.85
        self.mutation_rate = 0.2
        self.elitism_count = 2

        self.logger.info(
            f"Using tuned parameters: pop={self.population_size}, gen={self.generations}"
        )
