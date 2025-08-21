"""
Pattern Domain Interfaces

This module exports all interfaces for the pattern domain, following the
Interface Segregation Principle to provide focused contracts for clients.
"""

from .pattern_extractor_interface import (
    PatternExtractorInterface,
    PatternMatcherInterface,
    PatternCacheInterface,
    ExtractionResult,
    PatternMatchResult
)

from .pattern_validator_interface import (
    PatternValidatorInterface,
    PatternPerformanceInterface,
    PatternCompatibilityInterface,
    ValidationResult,
    SecurityRisk,
    PatternComplexityResult
)

__all__ = [
    # Extractor interfaces
    'PatternExtractorInterface',
    'PatternMatcherInterface',
    'PatternCacheInterface',
    
    # Validator interfaces
    'PatternValidatorInterface',
    'PatternPerformanceInterface',
    'PatternCompatibilityInterface',
    
    # Data classes
    'ExtractionResult',
    'PatternMatchResult',
    'ValidationResult',
    'SecurityRisk',
    'PatternComplexityResult'
]