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
        panel_width_cm: float,
        panel_height_cm: float,
        spacing_cm: float,
        angle: float,
        padding_cm: float,
        gps_system=None,
        tune_parameters: bool = False,
    ) -> List[np.ndarray]:
        """
        Optimize panel placement using a genetic algorithm while maintaining orientation.

        Args:
            roof_polygon: Roof polygon coordinates in cm (N x 2 array)
            objects: List of obstacle objects in GPS coordinates
            panel_width_cm: Panel width in centimeters
            panel_height_cm: Panel height in centimeters
            spacing_cm: Spacing between panels in centimeters
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

            # Panel template in cm
            panel_template = np.array(
                [
                    [0, 0],
                    [panel_width_cm, 0],
                    [panel_width_cm, panel_height_cm],
                    [0, panel_height_cm],
                ]
            )

            for _ in range(5):
                population = self._initialize_population(spacing_cm)
                best_fitness = 0

                for generation in range(self.generations):
                    fitness_scores = []
                    solutions = []

                    for offset_x, offset_y in population:
                        cache_key = (offset_x, offset_y)
                        if cache_key in self.fitness_cache:
                            fitness, panels = self.fitness_cache[cache_key]
                            self.metrics.cache_hits += 1
                        else:
                            try:
                                panels = self._generate_grid_cm(
                                    rotated_roof=rotated_roof,
                                    rotated_objects=rotated_objects,
                                    panel_template=panel_template,
                                    panel_width_cm=panel_width_cm,
                                    panel_height_cm=panel_height_cm,
                                    spacing_cm=spacing_cm,
                                    padding_cm=padding_cm,
                                    rot_min_x=rot_min_x,
                                    rot_min_y=rot_min_y,
                                    rot_max_x=rot_max_x,
                                    rot_max_y=rot_max_y,
                                    offset_x=offset_x,
                                    offset_y=offset_y,
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

                    # Early stopping check
                    if generation > 0:
                        current_max_fitness = (
                            max(fitness_scores) if fitness_scores else 0
                        )
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
                    else:
                        self.previous_best_fitness = (
                            max(fitness_scores) if fitness_scores else 0
                        )

                    population = self._create_new_population(
                        population, fitness_scores, spacing_cm
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
        panel_template: np.ndarray,
        panel_width_cm: float,
        panel_height_cm: float,
        spacing_cm: float,
        padding_cm: float,
        rot_min_x: float,
        rot_min_y: float,
        rot_max_x: float,
        rot_max_y: float,
        offset_x: float,
        offset_y: float,
        angle_degrees: float,
        center_x: float,
        center_y: float,
    ) -> List[np.ndarray]:
        """Generate grid of panels in cm coordinates with given offsets."""
        from shapely.affinity import rotate as shapely_rotate
        from shapely.geometry import Polygon

        panels = []
        step_y = panel_height_cm + spacing_cm
        step_x = panel_width_cm + spacing_cm

        y = rot_min_y + padding_cm + offset_y
        while y + panel_height_cm + padding_cm <= rot_max_y:
            x = rot_min_x + padding_cm + offset_x
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

        return panels

    def _initialize_population(self, spacing: float) -> List[Tuple[float, float]]:
        """Initialize a diverse population of offset pairs using vectorized operations."""
        max_offset = max(50.0, spacing if spacing > 0 else 50.0)
        population = []

        if spacing > 0:
            num_steps = int(spacing) if spacing >= 1 else 10
            i_values = np.linspace(
                0, spacing, min(self.population_size // 2, num_steps)
            )
            j_values = np.linspace(
                0,
                spacing,
                min((self.population_size // 2) // len(i_values) + 1, num_steps),
            )

            if len(i_values) > 0 and len(j_values) > 0:
                i_grid, j_grid = np.meshgrid(i_values, j_values)
                pairs = list(zip(i_grid.flatten(), j_grid.flatten()))
                population.extend(pairs[: self.population_size // 2])

        remaining = self.population_size - len(population)
        if remaining > 0:
            random_offsets_x = np.random.uniform(0, max_offset, size=remaining)
            random_offsets_y = np.random.uniform(0, max_offset, size=remaining)
            population.extend(zip(random_offsets_x, random_offsets_y))

        return population[: self.population_size]

    def _create_new_population(
        self,
        population: List[Tuple[float, float]],
        fitness_scores: List[int],
        spacing: float,
    ) -> List[Tuple[float, float]]:
        """Create a new population through selection, crossover, and mutation."""
        new_population = []

        if self.elitism_count > 0 and fitness_scores:
            elite_indices = np.argsort(fitness_scores)[-self.elitism_count :]
            for idx in elite_indices:
                new_population.append(population[idx])

        unique_individuals = set(population)
        diversity_factor = len(unique_individuals) / max(1, len(population))
        adaptive_mutation_rate = self.mutation_rate * (1.5 - diversity_factor)

        while len(new_population) < self.population_size:
            parent1 = self._tournament_selection(population, fitness_scores)
            parent2 = self._tournament_selection(population, fitness_scores)

            if np.random.random() < self.crossover_rate:
                child1, child2 = self._crossover(parent1, parent2)
            else:
                child1, child2 = parent1, parent2

            child1 = self._mutate(child1, spacing, mutation_rate=adaptive_mutation_rate)
            child2 = self._mutate(child2, spacing, mutation_rate=adaptive_mutation_rate)

            new_population.append(child1)
            if len(new_population) < self.population_size:
                new_population.append(child2)

        return new_population

    def _tournament_selection(
        self, population: List[Tuple[float, float]], fitness_scores: List[int]
    ) -> Tuple[float, float]:
        """Select individual using tournament selection."""
        if not population or not fitness_scores:
            return (0.0, 0.0)

        indices = np.random.choice(
            len(population), min(self.tournament_size, len(population)), replace=False
        )
        tournament_fitness = [fitness_scores[i] for i in indices]
        winner_idx = indices[np.argmax(tournament_fitness)]
        return population[winner_idx]

    def _crossover(
        self, parent1: Tuple[float, float], parent2: Tuple[float, float]
    ) -> Tuple[Tuple[float, float], Tuple[float, float]]:
        """Perform crossover between two parents."""
        if np.random.random() < 0.5:
            child1 = (parent1[0], parent2[1])
            child2 = (parent2[0], parent1[1])
        else:
            alpha = np.random.random()
            child1_x = alpha * parent1[0] + (1 - alpha) * parent2[0]
            child1_y = alpha * parent1[1] + (1 - alpha) * parent2[1]
            child2_x = (1 - alpha) * parent1[0] + alpha * parent2[0]
            child2_y = (1 - alpha) * parent1[1] + alpha * parent2[1]

            child1 = (child1_x, child1_y)
            child2 = (child2_x, child2_y)

        return child1, child2

    def _mutate(
        self,
        individual: Tuple[float, float],
        spacing: float,
        mutation_rate: Optional[float] = None,
    ) -> Tuple[float, float]:
        """Mutate an individual with adaptive mutation strength."""
        if mutation_rate is None:
            mutation_rate = self.mutation_rate

        offset_x, offset_y = individual

        # Adaptive mutation - stronger mutations when needed
        power_law = np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1])

        if np.random.random() < mutation_rate:
            mutation_strength = np.random.uniform(-3 * power_law, 4 * power_law)

            if spacing > 0:
                offset_x = (offset_x + mutation_strength) % max(0.1, spacing)
            else:
                offset_x = max(0.0, offset_x + mutation_strength)

        if np.random.random() < mutation_rate:
            mutation_strength = np.random.uniform(-3 * power_law, 4 * power_law)

            if spacing > 0:
                offset_y = (offset_y + mutation_strength) % max(0.1, spacing)
            else:
                offset_y = max(0.0, offset_y + mutation_strength)

        return (offset_x, offset_y)

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
