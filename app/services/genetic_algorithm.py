import logging
import time
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

import cv2
import numpy as np


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
        # Only add handler if no handlers exist for the logger
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            # Prevent handler from being added to parent loggers
            self.logger.propagate = False

    def optimize_panel_placement(
        self,
        mask: np.ndarray,
        panel_size: Tuple[int, int],
        spacing: int,
        angle: float,
        center: np.ndarray,
        padding_px: int,
        generate_grid_fn: Callable,
        tune_parameters: bool = False,
    ) -> List[np.ndarray]:
        """
        Optimize panel placement using a genetic algorithm while maintaining orientation.

        Args:
            mask: Binary mask representing valid placement areas
            panel_size: Size of panels (width, height) in pixels
            spacing: Spacing between panels in pixels
            angle: Orientation angle in radians
            center: Center point for rotation
            padding_px: Padding in pixels from the edge
            generate_grid_fn: Function to generate panel grid with given parameters
            tune_parameters: Whether to tune GA parameters first

        Returns:
            List of optimally placed panels as arrays of corner coordinates
        """
        start_time = time.time()
        self.metrics = OptimizationMetrics()  # Reset metrics

        # Track global best solution across all attempts
        global_best_solution = None
        global_best_fitness = 0

        if tune_parameters:
            self._tune_genetic_parameters(
                mask, panel_size, spacing, angle, center, padding_px, generate_grid_fn
            )

        self.fitness_cache = {}
        self.previous_best_fitness = 0
        stagnation_counter = 0

        try:
            kernel_size = max(1, spacing + (2 * padding_px) + 2)
            eroded_mask = cv2.erode(
                mask, np.ones((kernel_size, kernel_size), np.uint8), iterations=1
            )

            angle_degrees = np.degrees(angle)
            rotation_matrix = cv2.getRotationMatrix2D(tuple(center), angle_degrees, 1.0)
            inv_rotation_matrix = cv2.getRotationMatrix2D(
                tuple(center), -angle_degrees, 1.0
            )

            rotated_mask = cv2.warpAffine(
                eroded_mask, rotation_matrix, mask.shape[1::-1]
            )

            coords = cv2.findNonZero(rotated_mask)
            if coords is None:
                self.logger.warning("No valid area found for panel placement")
                return []

            x, y, w, h = cv2.boundingRect(coords)

            # Run optimization multiple times with different initial populations
            for attempt in range(3):  # Try 3 different initial populations
                population = self._initialize_population(spacing)
                # best_solution = None
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
                                panels = generate_grid_fn(
                                    rotated_mask=rotated_mask,
                                    panel_size=panel_size,
                                    spacing=spacing,
                                    x=x,
                                    y=y,
                                    w=w,
                                    h=h,
                                    padding_px=padding_px,
                                    offset_x=offset_x,
                                    offset_y=offset_y,
                                    inv_rotation_matrix=inv_rotation_matrix,
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
                            # best_solution = panels

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
                        population, fitness_scores, spacing
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
            self.logger.error(f"Error in optimization: {str(e)}")
            self.metrics.total_time_seconds = time.time() - start_time
            return []

    def _initialize_population(self, spacing: int) -> List[Tuple[int, int]]:
        """Initialize a diverse population of offset pairs using vectorized operations."""
        max_offset = max(50, spacing if spacing > 0 else 50)
        population = []

        if spacing > 0:
            i_values = np.arange(min(self.population_size // 2, spacing))
            j_values = np.arange(
                min((self.population_size // 2) // len(i_values) + 1, spacing)
            )

            if len(i_values) > 0 and len(j_values) > 0:
                i_grid, j_grid = np.meshgrid(i_values, j_values)
                pairs = list(zip(i_grid.flatten(), j_grid.flatten()))
                population.extend(pairs[: self.population_size // 2])

        remaining = self.population_size - len(population)
        if remaining > 0:
            random_offsets_x = np.random.randint(0, max_offset, size=remaining)
            random_offsets_y = np.random.randint(0, max_offset, size=remaining)
            population.extend(zip(random_offsets_x, random_offsets_y))

        return population[: self.population_size]

    def _create_new_population(
        self, population: List[Tuple[int, int]], fitness_scores: List[int], spacing: int
    ) -> List[Tuple[int, int]]:
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
        self, population: List[Tuple[int, int]], fitness_scores: List[int]
    ) -> Tuple[int, int]:
        """Select individual using tournament selection."""
        if not population or not fitness_scores:
            return (0, 0)

        indices = np.random.choice(
            len(population), min(self.tournament_size, len(population)), replace=False
        )
        tournament_fitness = [fitness_scores[i] for i in indices]
        winner_idx = indices[np.argmax(tournament_fitness)]
        return population[winner_idx]

    def _crossover(
        self, parent1: Tuple[int, int], parent2: Tuple[int, int]
    ) -> Tuple[Tuple[int, int], Tuple[int, int]]:
        """Perform crossover between two parents."""
        if np.random.random() < 0.5:
            child1 = (parent1[0], parent2[1])
            child2 = (parent2[0], parent1[1])
        else:
            alpha = np.random.random()
            child1_x = int(alpha * parent1[0] + (1 - alpha) * parent2[0])
            child1_y = int(alpha * parent1[1] + (1 - alpha) * parent2[1])
            child2_x = int((1 - alpha) * parent1[0] + alpha * parent2[0])
            child2_y = int((1 - alpha) * parent1[1] + alpha * parent2[1])

            child1 = (child1_x, child1_y)
            child2 = (child2_x, child2_y)

        return child1, child2

    def _mutate(
        self,
        individual: Tuple[int, int],
        spacing: int,
        mutation_rate: Optional[float] = None,
    ) -> Tuple[int, int]:
        """Mutate an individual with adaptive mutation strength."""
        if mutation_rate is None:
            mutation_rate = self.mutation_rate

        offset_x, offset_y = individual

        # Adaptive mutation - stronger mutations when needed
        power_law = np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1])

        if np.random.random() < mutation_rate:
            mutation_strength = np.random.randint(-3 * power_law, 4 * power_law)

            if spacing > 0:
                offset_x = (offset_x + mutation_strength) % max(1, spacing)
            else:
                offset_x = max(0, offset_x + mutation_strength)

        if np.random.random() < mutation_rate:
            mutation_strength = np.random.randint(-3 * power_law, 4 * power_law)

            if spacing > 0:
                offset_y = (offset_y + mutation_strength) % max(1, spacing)
            else:
                offset_y = max(0, offset_y + mutation_strength)

        return (offset_x, offset_y)

    def _tune_genetic_parameters(
        self,
        mask: np.ndarray,
        panel_size: Tuple[int, int],
        spacing: int,
        angle: float,
        center: np.ndarray,
        padding_px: int,
        generate_grid_fn: Callable,
    ) -> None:
        """Tune genetic algorithm parameters for optimal performance using Bayesian Optimization."""
        self.logger.info(
            "Starting genetic algorithm parameter tuning with Bayesian Optimization..."
        )

        # Initialize with parameters that tend to produce more panels
        self.population_size = 26
        self.generations = 12
        self.tournament_size = 4
        self.crossover_rate = 0.85
        self.mutation_rate = 0.2
        self.elitism_count = 2

        kernel_size = spacing + (2 * padding_px) + 2
        eroded_mask = cv2.erode(
            mask, np.ones((kernel_size, kernel_size), np.uint8), iterations=1
        )
        angle_degrees = np.degrees(angle)
        rotation_matrix = cv2.getRotationMatrix2D(tuple(center), angle_degrees, 1.0)
        rotated_mask = cv2.warpAffine(eroded_mask, rotation_matrix, mask.shape[1::-1])

        coords = cv2.findNonZero(rotated_mask)
        if coords is None:
            self.logger.warning(
                "No valid area found for panel placement. Skipping tuning."
            )
            return

        grid_configs = [
            [26, 12, 4, 0.85, 0.2, 2],  # Optimized for max panels
            [25, 12, 4, 0.75, 0.2, 2],  # Diverse
            [20, 10, 3, 0.8, 0.1, 2],  # Balanced
        ]

        best_panel_count = 0
        best_panel_params = None

        # Test each configuration and use the one that produces the most panels
        for config in grid_configs:
            optimizer = PanelGeneticOptimizer(
                population_size=int(config[0]),
                generations=int(config[1]),
                tournament_size=int(config[2]),
                crossover_rate=float(config[3]),
                mutation_rate=float(config[4]),
                elitism_count=int(config[5]),
            )

            panels = optimizer.optimize_panel_placement(
                mask=mask,
                panel_size=panel_size,
                spacing=spacing,
                angle=angle,
                center=center,
                padding_px=padding_px,
                generate_grid_fn=generate_grid_fn,
            )

            panel_count = len(panels)
            if panel_count > best_panel_count:
                best_panel_count = panel_count
                best_panel_params = {
                    "population_size": int(config[0]),
                    "generations": int(config[1]),
                    "tournament_size": int(config[2]),
                    "crossover_rate": float(config[3]),
                    "mutation_rate": float(config[4]),
                    "elitism_count": int(config[5]),
                }

        if best_panel_params:
            self.logger.info(
                f"Using parameters that produced most panels ({best_panel_count}): {best_panel_params}"
            )
            self.population_size = best_panel_params["population_size"]
            self.generations = best_panel_params["generations"]
            self.tournament_size = best_panel_params["tournament_size"]
            self.crossover_rate = best_panel_params["crossover_rate"]
            self.mutation_rate = best_panel_params["mutation_rate"]
            self.elitism_count = best_panel_params["elitism_count"]
