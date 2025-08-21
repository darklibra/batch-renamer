"""
File Domain Interfaces

This module exports all interfaces for the file domain, following the
Interface Segregation Principle to provide focused contracts for clients.
"""

from .file_indexer_interface import (
    FileIndexerInterface,
    FileIndexingJobInterface, 
    FileValidatorInterface
)

__all__ = [
    'FileIndexerInterface',
    'FileIndexingJobInterface',
    'FileValidatorInterface'
]