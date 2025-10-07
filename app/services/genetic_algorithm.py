import logging
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
from shapely.affinity import rotate as shapely_rotate
from shapely.geometry import Polygon


@dataclass
class OptimizationMetrics:
    """Metrics collected during optimization process"""

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
        self.fitness_cache = {}
        self.previous_best_fitness = 0
        self.metrics = OptimizationMetrics()

        self.fitness_history = []  # Track best fitness over generations
        self.convergence_window = 5  # Window for convergence rate calculation

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
        """
        Optimize panel placement using a genetic algorithm with dual orientation support.

        Args:
            roof_polygon: Roof polygon coordinates in cm (N x 2 array)
            objects: List of obstacle objects in GPS coordinates
            vertical_dims: (width, height) for vertical orientation with pitch adjustment
            horizontal_dims: (width, height) for horizontal orientation with pitch adjustment
            spacing_cm: Base spacing between panels in centimeters
            angle: Orientation angle in radians
            padding_cm: Padding in centimeters from the edge
            gps_system: GPS coordinate system for converting objects
            tune_parameters: Whether to tune GA parameters first

        Returns:
            List of optimally placed panels as arrays of corner coordinates in cm
        """
        start_time = time.time()
        self.metrics = OptimizationMetrics()

        global_best_solution = None
        global_best_fitness = 0

        # Convert objects from GPS to cm if gps_system is provided
        object_polys = []
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
        self.fitness_history = []  # Reset fitness history for new optimization
        stagnation_counter = 0

        try:
            # Rotate roof and objects
            angle_degrees = -np.degrees(angle)
            rotated_roof = shapely_rotate(
                roof_poly, angle_degrees, origin=(center_x, center_y)
            )
            rotated_objects = [
                shapely_rotate(obj, angle_degrees, origin=(center_x, center_y))
                for obj in object_polys
            ]

            # Get rotated bounds
            rot_min_x, rot_min_y, rot_max_x, rot_max_y = rotated_roof.bounds

            for _ in range(5):
                population = self._initialize_population(spacing_cm, panel_orientation)
                best_fitness = 0

                for generation in range(self.generations):
                    fitness_scores = []
                    solutions = []

                    for chromosome in population:
                        (
                            offset_x,
                            offset_y,
                            orientation,
                            spacing_x_mult,
                            spacing_y_mult,
                            stagger_offset,
                        ) = chromosome
                        cache_key = chromosome

                        if cache_key in self.fitness_cache:
                            fitness, panels = self.fitness_cache[cache_key]
                            self.metrics.cache_hits += 1
                        else:
                            try:
                                # Select dimensions based on orientation
                                is_vertical = orientation == 0
                                if is_vertical:
                                    # Vertical: panel aligned with longest edge (tall: narrow × tall)
                                    panel_width_cm, panel_height_cm = vertical_dims
                                    if generation == 0 and len(fitness_scores) == 0:
                                        self.logger.info(
                                            f"VERTICAL: {panel_width_cm:.1f}cm × {panel_height_cm:.1f}cm | Offset: ({offset_x:.1f}, {offset_y:.1f})"
                                        )
                                else:
                                    # Horizontal: panel perpendicular to longest edge (wide: wide × short)
                                    # horizontal_dims already swapped and pitch-corrected in panel_service
                                    panel_width_cm, panel_height_cm = horizontal_dims
                                    if generation == 0 and len(fitness_scores) == 0:
                                        self.logger.info(
                                            f"HORIZONTAL: {panel_width_cm:.1f}cm × {panel_height_cm:.1f}cm | Offset: ({offset_x:.1f}, {offset_y:.1f})"
                                        )

                                # Calculate variable spacing
                                actual_spacing_x = spacing_cm * spacing_x_mult
                                actual_spacing_y = spacing_cm * spacing_y_mult

                                panels = self._generate_grid_cm(
                                    rotated_roof=rotated_roof,
                                    rotated_objects=rotated_objects,
                                    panel_width_cm=panel_width_cm,
                                    panel_height_cm=panel_height_cm,
                                    spacing_x_cm=actual_spacing_x,
                                    spacing_y_cm=actual_spacing_y,
                                    padding_cm=padding_cm,
                                    rot_min_x=rot_min_x,
                                    rot_min_y=rot_min_y,
                                    rot_max_x=rot_max_x,
                                    rot_max_y=rot_max_y,
                                    offset_x=offset_x,
                                    offset_y=offset_y,
                                    stagger_offset=stagger_offset,
                                    angle_degrees=angle_degrees,
                                    center_x=center_x,
                                    center_y=center_y,
                                )

                                fitness = len(panels)
                                self.fitness_cache[cache_key] = (fitness, panels)
                                self.metrics.cache_misses += 1
                            except Exception as e:
                                self.logger.error(f"Error generating grid: {e}")
                                fitness = 0
                                panels = []

                        fitness_scores.append(fitness)
                        solutions.append(panels)

                        # Update local best
                        if fitness > best_fitness:
                            best_fitness = fitness

                        # Update global best
                        if fitness > global_best_fitness:
                            global_best_fitness = fitness
                            global_best_solution = panels

                    # Track fitness history for convergence rate calculation
                    current_max_fitness = max(fitness_scores) if fitness_scores else 0
                    self.fitness_history.append(current_max_fitness)

                    # Early stopping check
                    if generation > 0:
                        if (
                            abs(current_max_fitness - self.previous_best_fitness)
                            < 0.001
                        ):
                            stagnation_counter += 1
                            if stagnation_counter >= self.early_stop_threshold:
                                self.metrics.early_stopped = True
                                break
                        else:
                            stagnation_counter = 0

                    self.previous_best_fitness = current_max_fitness

                    population = self._create_new_population(
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

    def _generate_grid_cm(
        self,
        rotated_roof,
        rotated_objects: List,
        panel_width_cm: float,
        panel_height_cm: float,
        spacing_x_cm: float,
        spacing_y_cm: float,
        padding_cm: float,
        rot_min_x: float,
        rot_min_y: float,
        rot_max_x: float,
        rot_max_y: float,
        offset_x: float,
        offset_y: float,
        stagger_offset: float,
        angle_degrees: float,
        center_x: float,
        center_y: float,
    ) -> List[np.ndarray]:
        """
        Generate grid of panels with variable spacing and staggered/brick-pattern layouts.

        Args:
            stagger_offset: Horizontal offset for alternating rows (0.0 to 1.0)
                           0.0 = no stagger (regular grid)
                           0.5 = half panel width offset (classic brick pattern)
                           1.0 = full panel width offset
        """

        panels = []

        # Panel template based on dimensions
        panel_template = np.array(
            [
                [0, 0],
                [panel_width_cm, 0],
                [panel_width_cm, panel_height_cm],
                [0, panel_height_cm],
            ]
        )

        step_x = panel_width_cm + spacing_x_cm
        step_y = panel_height_cm + spacing_y_cm

        # Calculate stagger displacement in cm
        stagger_displacement = panel_width_cm * stagger_offset

        row_index = 0
        y = rot_min_y + padding_cm + offset_y
        while y + panel_height_cm + padding_cm <= rot_max_y:
            # Alternate rows get staggered by the displacement
            row_stagger = stagger_displacement if (row_index % 2 == 1) else 0.0

            x = rot_min_x + padding_cm + offset_x + row_stagger
            while x + panel_width_cm + padding_cm <= rot_max_x:
                panel = panel_template + [x, y]
                panel_poly = Polygon(panel)

                if rotated_roof.contains(panel_poly):
                    overlaps = any(
                        panel_poly.intersects(obj) for obj in rotated_objects
                    )
                    if not overlaps:
                        # Rotate panel back to original coordinate system
                        rotated_back = shapely_rotate(
                            panel_poly, -angle_degrees, origin=(center_x, center_y)
                        )
                        panels.append(np.array(rotated_back.exterior.coords[:4]))

                x += step_x
            y += step_y
            row_index += 1

        return panels

    def _initialize_population(
        self,
        spacing: float,
        panel_orientation: str = "best",
    ) -> List[Tuple[float, float, int, float, float, float]]:
        """
        Initialize a diverse population with enhanced chromosome structure.
        Chromosome: (offset_x, offset_y, orientation, spacing_x_mult, spacing_y_mult, stagger_offset)
        - offset_x, offset_y: grid offsets in increments of 0.5 cm only
        - orientation: 0 = vertical, 1 = horizontal
        - spacing_x_mult, spacing_y_mult: multipliers for spacing (0.5 to 2.0)
        - stagger_offset: horizontal offset for alternating rows (0.0 to 1.0 = 0% to 100% of panel width)
        """
        max_offset = max(50.0, spacing if spacing > 0 else 50.0)
        population = []

        # Create diverse initial population
        for _ in range(self.population_size):
            # Generate offsets in 0.5 cm increments only
            offset_x = np.round(np.random.uniform(0, max_offset) * 2) / 2
            offset_y = np.round(np.random.uniform(0, max_offset) * 2) / 2

            # Set orientation based on user preference
            if panel_orientation == "vertical":
                orientation = 0
            elif panel_orientation == "horizontal":
                orientation = 1
            else:  # "best" - try both orientations
                orientation = np.random.choice([0, 1])

            spacing_x_mult = np.random.uniform(0.5, 2.0)
            spacing_y_mult = np.random.uniform(0.5, 2.0)

            # No stagger - pure grid only
            stagger_offset = 0.0

            population.append(
                (
                    offset_x,
                    offset_y,
                    orientation,
                    spacing_x_mult,
                    spacing_y_mult,
                    stagger_offset,
                )
            )

        return population

    def _create_new_population(
        self,
        population: List[Tuple[float, float, int, float, float, float]],
        fitness_scores: List[int],
        spacing: float,
        panel_orientation: str = "best",
    ) -> List[Tuple[float, float, int, float, float, float]]:
        """Create a new population through selection, crossover, and mutation with self-adaptive mutation."""
        new_population = []

        if self.elitism_count > 0 and fitness_scores:
            elite_indices = np.argsort(fitness_scores)[-self.elitism_count :]
            for idx in elite_indices:
                new_population.append(population[idx])

        # Calculate population diversity and convergence rate
        diversity_score = self._calculate_population_diversity(population)
        convergence_rate = self._calculate_convergence_rate()

        # Store metrics
        self.metrics.average_population_similarity = diversity_score
        self.metrics.convergence_rate = convergence_rate

        # Self-adaptive mutation rate
        # Low diversity (similar chromosomes) → Increase mutation
        # Low convergence (stagnant) → Increase mutation
        # High diversity + High convergence → Decrease mutation
        diversity_factor = 1.0 - diversity_score  # Invert: low diversity = high factor
        stagnation_factor = 1.0 - convergence_rate  # Low convergence = high factor

        # Adaptive mutation: base rate * (1.0 + diversity_factor + stagnation_factor)
        # Range: mutation_rate * 1.0 to mutation_rate * 3.0
        adaptive_mutation_rate = self.mutation_rate * (
            1.0 + diversity_factor + stagnation_factor
        )
        adaptive_mutation_rate = min(adaptive_mutation_rate, 0.5)  # Cap at 50%

        self.logger.debug(
            f"Adaptive mutation: rate={adaptive_mutation_rate:.3f}, "
            f"diversity={diversity_score:.3f}, convergence={convergence_rate:.3f}"
        )

        # Calculate fitness ranks for rank-based mutation strength
        fitness_ranks = np.argsort(np.argsort(fitness_scores))  # 0 = worst, N-1 = best

        while len(new_population) < self.population_size:
            parent1 = self._tournament_selection(population, fitness_scores)
            parent2 = self._tournament_selection(population, fitness_scores)

            if np.random.random() < self.crossover_rate:
                child1, child2 = self._crossover(parent1, parent2, panel_orientation)
            else:
                child1, child2 = parent1, parent2

            # Find parent ranks for adaptive mutation strength
            parent1_idx = population.index(parent1) if parent1 in population else 0
            parent1_rank = fitness_ranks[parent1_idx] / max(
                1, len(fitness_ranks) - 1
            )  # Normalize 0-1

            parent2_idx = population.index(parent2) if parent2 in population else 0
            parent2_rank = fitness_ranks[parent2_idx] / max(1, len(fitness_ranks) - 1)

            child1 = self._mutate(
                child1,
                spacing,
                mutation_rate=adaptive_mutation_rate,
                panel_orientation=panel_orientation,
                fitness_rank=parent1_rank,
            )
            child2 = self._mutate(
                child2,
                spacing,
                mutation_rate=adaptive_mutation_rate,
                panel_orientation=panel_orientation,
                fitness_rank=parent2_rank,
            )

            new_population.append(child1)
            if len(new_population) < self.population_size:
                new_population.append(child2)

        return new_population

    def _tournament_selection(
        self,
        population: List[Tuple[float, float, int, float, float, float]],
        fitness_scores: List[int],
    ) -> Tuple[float, float, int, float, float, float]:
        """Select individual using tournament selection."""
        if not population or not fitness_scores:
            return (0.0, 0.0, 0, 1.0, 1.0, 0.0)

        indices = np.random.choice(
            len(population), min(self.tournament_size, len(population)), replace=False
        )
        tournament_fitness = [fitness_scores[i] for i in indices]
        winner_idx = indices[np.argmax(tournament_fitness)]
        return population[winner_idx]

    def _calculate_chromosome_similarity(
        self,
        chromosome1: Tuple[float, float, int, float, float, float],
        chromosome2: Tuple[float, float, int, float, float, float],
    ) -> float:
        """
        Calculate similarity between two chromosomes using Euclidean distance.
        Returns normalized distance (0 = identical, 1 = very different).
        """
        # Normalize continuous values for fair distance calculation
        # offset_x, offset_y typically 0-50
        # spacing_x_mult, spacing_y_mult range 0.5-2.0
        # orientation is 0 or 1
        # stagger_offset range 0.0-1.0

        x1, y1, o1, sx1, sy1, stagger1 = chromosome1
        x2, y2, o2, sx2, sy2, stagger2 = chromosome2

        # Euclidean distance with weighted components
        offset_dist = (
            np.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) / 50.0
        )  # Normalize by max offset
        spacing_dist = (
            np.sqrt((sx1 - sx2) ** 2 + (sy1 - sy2) ** 2) / 1.5
        )  # Normalize by range
        orientation_dist = abs(o1 - o2)  # Already 0 or 1
        stagger_dist = abs(stagger1 - stagger2)  # Already normalized 0-1

        # Combined distance (weighted average)
        total_dist = (
            0.3 * offset_dist
            + 0.3 * spacing_dist
            + 0.15 * orientation_dist
            + 0.25 * stagger_dist
        )

        return min(total_dist, 1.0)  # Cap at 1.0

    def _calculate_population_diversity(
        self, population: List[Tuple[float, float, int, float, float, float]]
    ) -> float:
        """
        Calculate average pairwise similarity in population.
        Returns diversity score: 0 = all identical, 1 = highly diverse.
        """
        if len(population) < 2:
            return 0.0

        similarities = []
        # Sample pairs to avoid O(n^2) for large populations
        sample_size = min(len(population), 50)
        sampled_pop = np.random.choice(len(population), sample_size, replace=False)

        for i in range(len(sampled_pop)):
            for j in range(i + 1, len(sampled_pop)):
                similarity = self._calculate_chromosome_similarity(
                    population[sampled_pop[i]], population[sampled_pop[j]]
                )
                similarities.append(similarity)

        avg_similarity = np.mean(similarities) if similarities else 0.0
        return avg_similarity  # Higher = more diverse

    def _calculate_convergence_rate(self) -> float:
        """
        Calculate convergence rate based on fitness improvement over recent generations.
        Returns: rate of improvement (0 = stagnant, 1 = rapid improvement).
        """
        if len(self.fitness_history) < 2:
            return 0.5  # Default mid-range

        # Look at recent history
        recent_history = self.fitness_history[-self.convergence_window :]

        if len(recent_history) < 2:
            return 0.5

        # Calculate improvement rate
        improvements = []
        for i in range(1, len(recent_history)):
            if recent_history[i - 1] > 0:
                improvement = (
                    recent_history[i] - recent_history[i - 1]
                ) / recent_history[i - 1]
                improvements.append(improvement)

        avg_improvement = np.mean(improvements) if improvements else 0.0

        # Normalize: 0.1 (10% improvement) = rapid, near 0 = stagnant
        convergence_rate = max(0.0, min(1.0, abs(avg_improvement) * 10))

        return convergence_rate

    def _crossover(
        self,
        parent1: Tuple[float, float, int, float, float, float],
        parent2: Tuple[float, float, int, float, float, float],
        panel_orientation: str = "best",
    ) -> Tuple[
        Tuple[float, float, int, float, float, float],
        Tuple[float, float, int, float, float, float],
    ]:
        """Perform crossover between two parents with enhanced chromosome structure."""
        p1_x, p1_y, p1_orient, p1_sx, p1_sy, p1_stagger = parent1
        p2_x, p2_y, p2_orient, p2_sx, p2_sy, p2_stagger = parent2

        # Multi-point crossover
        if np.random.random() < 0.5:
            # Swap orientation and spacing parameters (only if "best" mode)
            if panel_orientation == "best":
                child1 = (p1_x, p1_y, p2_orient, p2_sx, p2_sy, 0.0)
                child2 = (p2_x, p2_y, p1_orient, p1_sx, p1_sy, 0.0)
            else:
                child1 = (p1_x, p1_y, p1_orient, p2_sx, p2_sy, 0.0)
                child2 = (p2_x, p2_y, p2_orient, p1_sx, p1_sy, 0.0)
        else:
            # Blend crossover for continuous values
            alpha = np.random.random()

            # Blend offsets and round to nearest 0.5 cm
            child1_x = np.round((alpha * p1_x + (1 - alpha) * p2_x) * 2) / 2
            child1_y = np.round((alpha * p1_y + (1 - alpha) * p2_y) * 2) / 2
            child2_x = np.round(((1 - alpha) * p1_x + alpha * p2_x) * 2) / 2
            child2_y = np.round(((1 - alpha) * p1_y + alpha * p2_y) * 2) / 2

            child1_sx = alpha * p1_sx + (1 - alpha) * p2_sx
            child1_sy = alpha * p1_sy + (1 - alpha) * p2_sy

            # Only mix orientations in "best" mode
            if panel_orientation == "best":
                child1_orient = np.random.choice([p1_orient, p2_orient])
                child2_orient = np.random.choice([p1_orient, p2_orient])
            else:
                child1_orient = p1_orient
                child2_orient = p2_orient

            child2_sx = (1 - alpha) * p1_sx + alpha * p2_sx
            child2_sy = (1 - alpha) * p1_sy + alpha * p2_sy

            child1 = (
                child1_x,
                child1_y,
                child1_orient,
                child1_sx,
                child1_sy,
                0.0,  # No stagger
            )
            child2 = (
                child2_x,
                child2_y,
                child2_orient,
                child2_sx,
                child2_sy,
                0.0,  # No stagger
            )

        return child1, child2

    def _mutate(
        self,
        individual: Tuple[float, float, int, float, float, float],
        spacing: float,
        mutation_rate: Optional[float] = None,
        panel_orientation: str = "best",
        fitness_rank: float = 0.5,
    ) -> Tuple[float, float, int, float, float, float]:
        """
        Mutate an individual with self-adaptive mutation strength.

        Args:
            individual: Chromosome to mutate
            spacing: Grid spacing
            mutation_rate: Base mutation rate (self-adaptive)
            panel_orientation: Orientation mode
            fitness_rank: Normalized fitness rank (0 = worst, 1 = best)

        Returns:
            Mutated chromosome
        """
        if mutation_rate is None:
            mutation_rate = self.mutation_rate

        (
            offset_x,
            offset_y,
            orientation,
            spacing_x_mult,
            spacing_y_mult,
            stagger_offset,
        ) = individual

        # Rank-based mutation strength
        # Low fitness individuals → Stronger mutations (more exploration)
        # High fitness individuals → Weaker mutations (fine-tuning)
        rank_factor = 1.0 - fitness_rank  # Invert: low rank = high factor
        strength_multiplier = 1.0 + (2.0 * rank_factor)  # Range: 1.0 to 3.0

        # Adaptive power law based on fitness rank
        if fitness_rank < 0.3:  # Poor performers
            power_law = np.random.choice([2, 3, 4], p=[0.5, 0.3, 0.2])
        elif fitness_rank < 0.7:  # Mid-range
            power_law = np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1])
        else:  # Top performers
            power_law = np.random.choice([1, 2], p=[0.8, 0.2])

        # Mutate offset_x in 0.5 cm increments only
        if np.random.random() < mutation_rate:
            # Generate mutation in 0.5 cm steps
            mutation_steps = np.random.randint(-power_law * 3, power_law * 4 + 1)
            mutation_strength = mutation_steps * 0.5 * strength_multiplier
            max_offset = max(50.0, spacing if spacing > 0 else 50.0)
            offset_x = np.clip(offset_x + mutation_strength, 0, max_offset)
            # Ensure it stays on 0.5 cm grid
            offset_x = np.round(offset_x * 2) / 2

        # Mutate offset_y in 0.5 cm increments only
        if np.random.random() < mutation_rate:
            # Generate mutation in 0.5 cm steps
            mutation_steps = np.random.randint(-power_law * 3, power_law * 4 + 1)
            mutation_strength = mutation_steps * 0.5 * strength_multiplier
            max_offset = max(50.0, spacing if spacing > 0 else 50.0)
            offset_y = np.clip(offset_y + mutation_strength, 0, max_offset)
            # Ensure it stays on 0.5 cm grid
            offset_y = np.round(offset_y * 2) / 2

        # Mutate orientation (flip with low probability) - only in "best" mode
        if panel_orientation == "best" and np.random.random() < mutation_rate * 0.3:
            orientation = 1 - orientation

        # Mutate spacing multipliers with rank-based strength
        if np.random.random() < mutation_rate:
            spacing_delta = np.random.uniform(-0.3, 0.3) * strength_multiplier
            spacing_x_mult = np.clip(spacing_x_mult + spacing_delta, 0.5, 2.0)

        if np.random.random() < mutation_rate:
            spacing_delta = np.random.uniform(-0.3, 0.3) * strength_multiplier
            spacing_y_mult = np.clip(spacing_y_mult + spacing_delta, 0.5, 2.0)

        # No stagger mutation - keep grid aligned (stagger_offset remains 0.0)

        return (
            offset_x,
            offset_y,
            orientation,
            spacing_x_mult,
            spacing_y_mult,
            0.0,  # stagger_offset always 0
        )

    def _tune_genetic_parameters(self) -> None:
        """Tune genetic algorithm parameters for optimal performance."""
        self.logger.info("Starting genetic algorithm parameter tuning...")

        # Set default optimized parameters
        self.population_size = 26
        self.generations = 12
        self.tournament_size = 4
        self.crossover_rate = 0.85
        self.mutation_rate = 0.2
        self.elitism_count = 2

        self.logger.info(
            f"Using tuned parameters: pop={self.population_size}, gen={self.generations}"
        )
