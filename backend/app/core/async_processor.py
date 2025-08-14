import asyncio
import time
from typing import List, Dict, Any, Optional, Callable, TypeVar, Generic, Awaitable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
import logging
from enum import Enum

logger = logging.getLogger(__name__)

T = TypeVar('T')
R = TypeVar('R')


class ProcessingStrategy(Enum):
    """Processing strategy options"""
    PARALLEL = "parallel"           # Pure async parallel processing
    BATCH_PARALLEL = "batch_parallel"  # Batch processing with parallel execution
    ADAPTIVE = "adaptive"           # Automatically choose based on workload


@dataclass
class ProcessingResult(Generic[R]):
    """Result of processing operation"""
    success: bool
    result: Optional[R] = None
    error: Optional[str] = None
    processing_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchProcessingResult(Generic[R]):
    """Result of batch processing operation"""
    total_items: int
    successful_items: int
    failed_items: int
    results: List[ProcessingResult[R]]
    total_processing_time_ms: float
    average_item_time_ms: float
    throughput_items_per_second: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class ProcessingConfig:
    """Configuration for async processing"""
    
    def __init__(
        self,
        max_concurrency: int = 10,
        batch_size: int = 100,
        timeout_seconds: float = 30.0,
        strategy: ProcessingStrategy = ProcessingStrategy.ADAPTIVE,
        retry_attempts: int = 0,
        backoff_factor: float = 2.0,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ):
        self.max_concurrency = max_concurrency
        self.batch_size = batch_size
        self.timeout_seconds = timeout_seconds
        self.strategy = strategy
        self.retry_attempts = retry_attempts
        self.backoff_factor = backoff_factor
        self.progress_callback = progress_callback


class AsyncBatchProcessor(Generic[T, R]):
    """
    High-performance async batch processor with multiple strategies
    """
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
        self._processing_stats = {
            'total_processed': 0,
            'total_successful': 0,
            'total_failed': 0,
            'total_time_ms': 0.0
        }
    
    async def process_batch(
        self,
        items: List[T],
        processor_func: Callable[[T], Awaitable[R]],
        item_name: str = "item"
    ) -> BatchProcessingResult[R]:
        """
        Process a batch of items using the configured strategy
        
        Args:
            items: List of items to process
            processor_func: Async function to process each item
            item_name: Name for logging (e.g., "file", "pattern")
            
        Returns:
            BatchProcessingResult with processing statistics
        """
        if not items:
            return BatchProcessingResult(
                total_items=0,
                successful_items=0,
                failed_items=0,
                results=[],
                total_processing_time_ms=0.0,
                average_item_time_ms=0.0,
                throughput_items_per_second=0.0
            )
        
        start_time = time.perf_counter()
        logger.info(f"Starting batch processing of {len(items)} {item_name}s with strategy {self.config.strategy.value}")
        
        # Choose processing strategy
        if self.config.strategy == ProcessingStrategy.ADAPTIVE:
            strategy = self._choose_adaptive_strategy(len(items))
        else:
            strategy = self.config.strategy
        
        # Execute processing
        if strategy == ProcessingStrategy.PARALLEL:
            results = await self._process_parallel(items, processor_func)
        else:  # BATCH_PARALLEL
            results = await self._process_batch_parallel(items, processor_func)
        
        # Calculate statistics
        total_time = (time.perf_counter() - start_time) * 1000  # ms
        successful = sum(1 for r in results if r.success)
        failed = len(results) - successful
        
        avg_time = sum(r.processing_time_ms for r in results) / len(results) if results else 0.0
        throughput = len(items) / (total_time / 1000) if total_time > 0 else 0.0
        
        # Update global stats
        self._processing_stats['total_processed'] += len(items)
        self._processing_stats['total_successful'] += successful
        self._processing_stats['total_failed'] += failed
        self._processing_stats['total_time_ms'] += total_time
        
        result = BatchProcessingResult(
            total_items=len(items),
            successful_items=successful,
            failed_items=failed,
            results=results,
            total_processing_time_ms=total_time,
            average_item_time_ms=avg_time,
            throughput_items_per_second=throughput,
            metadata={
                'strategy_used': strategy.value,
                'concurrency_level': self.config.max_concurrency,
                'batch_size': self.config.batch_size if strategy == ProcessingStrategy.BATCH_PARALLEL else len(items)
            }
        )
        
        logger.info(
            f"Batch processing completed: {successful}/{len(items)} successful "
            f"in {total_time:.1f}ms ({throughput:.1f} {item_name}s/sec)"
        )
        
        return result
    
    async def _process_parallel(
        self,
        items: List[T],
        processor_func: Callable[[T], Awaitable[R]]
    ) -> List[ProcessingResult[R]]:
        """Process all items in parallel with concurrency control"""
        semaphore = asyncio.Semaphore(self.config.max_concurrency)
        
        async def process_single_item(item: T, index: int) -> ProcessingResult[R]:
            async with semaphore:
                return await self._process_with_retry(item, processor_func, index)
        
        # Create tasks for all items
        tasks = [process_single_item(item, i) for i, item in enumerate(items)]
        
        # Process with progress updates
        results = []
        for i, coro in enumerate(asyncio.as_completed(tasks)):
            result = await coro
            results.append(result)
            
            # Progress callback
            if self.config.progress_callback and i % 10 == 0:
                self.config.progress_callback(i + 1, len(items))
        
        # Sort results by original order (if needed)
        return results
    
    async def _process_batch_parallel(
        self,
        items: List[T],
        processor_func: Callable[[T], Awaitable[R]]
    ) -> List[ProcessingResult[R]]:
        """Process items in batches with parallel execution within each batch"""
        all_results = []
        
        for i in range(0, len(items), self.config.batch_size):
            batch = items[i:i + self.config.batch_size]
            batch_num = i // self.config.batch_size + 1
            total_batches = (len(items) + self.config.batch_size - 1) // self.config.batch_size
            
            logger.debug(f"Processing batch {batch_num}/{total_batches} ({len(batch)} items)")
            
            # Process batch in parallel
            batch_results = await self._process_parallel(batch, processor_func)
            all_results.extend(batch_results)
            
            # Progress callback for batch completion
            if self.config.progress_callback:
                self.config.progress_callback(len(all_results), len(items))
            
            # Small delay between batches to prevent overwhelming
            if i + self.config.batch_size < len(items):
                await asyncio.sleep(0.01)
        
        return all_results
    
    async def _process_with_retry(
        self,
        item: T,
        processor_func: Callable[[T], Awaitable[R]],
        index: int
    ) -> ProcessingResult[R]:
        """Process single item with retry logic and timeout"""
        start_time = time.perf_counter()
        last_error = None
        
        for attempt in range(self.config.retry_attempts + 1):
            try:
                # Apply timeout to processing function
                result = await asyncio.wait_for(
                    processor_func(item),
                    timeout=self.config.timeout_seconds
                )
                
                processing_time = (time.perf_counter() - start_time) * 1000
                
                return ProcessingResult(
                    success=True,
                    result=result,
                    processing_time_ms=processing_time,
                    metadata={
                        'attempts': attempt + 1,
                        'index': index
                    }
                )
                
            except asyncio.TimeoutError as e:
                last_error = f"Timeout after {self.config.timeout_seconds}s"
                logger.warning(f"Item {index} timed out (attempt {attempt + 1})")
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Item {index} failed (attempt {attempt + 1}): {last_error}")
            
            # Wait before retry (exponential backoff)
            if attempt < self.config.retry_attempts:
                delay = self.config.backoff_factor ** attempt
                await asyncio.sleep(delay)
        
        # All attempts failed
        processing_time = (time.perf_counter() - start_time) * 1000
        
        return ProcessingResult(
            success=False,
            error=last_error,
            processing_time_ms=processing_time,
            metadata={
                'attempts': self.config.retry_attempts + 1,
                'index': index
            }
        )
    
    def _choose_adaptive_strategy(self, item_count: int) -> ProcessingStrategy:
        """Choose the best strategy based on workload characteristics"""
        
        # For small workloads, use pure parallel
        if item_count <= 50:
            return ProcessingStrategy.PARALLEL
        
        # For large workloads, use batch parallel to manage memory
        if item_count > 500:
            return ProcessingStrategy.BATCH_PARALLEL
        
        # For medium workloads, consider system load and concurrency
        if self.config.max_concurrency > 20:
            return ProcessingStrategy.BATCH_PARALLEL
        
        return ProcessingStrategy.PARALLEL
    
    def get_processing_stats(self) -> Dict[str, Any]:
        """Get cumulative processing statistics"""
        total_time_sec = self._processing_stats['total_time_ms'] / 1000
        avg_throughput = (
            self._processing_stats['total_processed'] / total_time_sec 
            if total_time_sec > 0 else 0.0
        )
        
        return {
            'total_processed': self._processing_stats['total_processed'],
            'total_successful': self._processing_stats['total_successful'],
            'total_failed': self._processing_stats['total_failed'],
            'success_rate_percent': (
                self._processing_stats['total_successful'] / self._processing_stats['total_processed'] * 100
                if self._processing_stats['total_processed'] > 0 else 0.0
            ),
            'total_processing_time_ms': self._processing_stats['total_time_ms'],
            'average_throughput_per_second': avg_throughput,
            'configuration': {
                'max_concurrency': self.config.max_concurrency,
                'batch_size': self.config.batch_size,
                'timeout_seconds': self.config.timeout_seconds,
                'strategy': self.config.strategy.value,
                'retry_attempts': self.config.retry_attempts
            }
        }
    
    def reset_stats(self):
        """Reset processing statistics"""
        self._processing_stats = {
            'total_processed': 0,
            'total_successful': 0,
            'total_failed': 0,
            'total_time_ms': 0.0
        }
        logger.info("Processing statistics reset")


class MemoryEfficientProcessor(Generic[T, R]):
    """
    Memory-efficient processor for large datasets using streaming
    """
    
    def __init__(self, max_memory_mb: int = 100):
        self.max_memory_mb = max_memory_mb
        self.chunk_size = 1000  # Items per chunk
    
    async def process_stream(
        self,
        item_stream: Callable[[], AsyncGenerator[T, None]],
        processor_func: Callable[[T], Awaitable[R]],
        result_handler: Callable[[List[ProcessingResult[R]]], Awaitable[None]]
    ) -> Dict[str, Any]:
        """
        Process items from a stream with memory management
        
        Args:
            item_stream: Async generator function that yields items
            processor_func: Function to process each item
            result_handler: Function to handle processed results
            
        Returns:
            Processing statistics
        """
        total_processed = 0
        total_successful = 0
        start_time = time.perf_counter()
        
        async for chunk in self._chunk_stream(item_stream(), self.chunk_size):
            # Process chunk
            config = ProcessingConfig(
                max_concurrency=10,
                strategy=ProcessingStrategy.PARALLEL
            )
            
            processor = AsyncBatchProcessor[T, R](config)
            result = await processor.process_batch(chunk, processor_func, "stream_item")
            
            # Handle results
            await result_handler(result.results)
            
            # Update stats
            total_processed += result.total_items
            total_successful += result.successful_items
            
            # Memory cleanup hint
            del result, chunk
            await asyncio.sleep(0.01)  # Allow GC
        
        total_time = (time.perf_counter() - start_time) * 1000
        
        return {
            'total_processed': total_processed,
            'total_successful': total_successful,
            'total_failed': total_processed - total_successful,
            'processing_time_ms': total_time,
            'throughput_per_second': total_processed / (total_time / 1000) if total_time > 0 else 0.0
        }
    
    async def _chunk_stream(
        self,
        stream: AsyncGenerator[T, None],
        chunk_size: int
    ) -> AsyncGenerator[List[T], None]:
        """Split async stream into chunks"""
        chunk = []
        
        async for item in stream:
            chunk.append(item)
            
            if len(chunk) >= chunk_size:
                yield chunk
                chunk = []
        
        # Yield remaining items
        if chunk:
            yield chunk


class ProcessingQueue:
    """
    Queue-based processor for background processing
    """
    
    def __init__(self, max_size: int = 10000):
        self.queue: asyncio.Queue[T] = asyncio.Queue(maxsize=max_size)
        self.processing = False
        self.results: asyncio.Queue[ProcessingResult[R]] = asyncio.Queue()
        self._stats = {
            'queued': 0,
            'processed': 0,
            'successful': 0,
            'failed': 0
        }
    
    async def add_item(self, item: T):
        """Add item to processing queue"""
        await self.queue.put(item)
        self._stats['queued'] += 1
    
    async def start_processing(
        self,
        processor_func: Callable[[T], Awaitable[R]],
        worker_count: int = 5
    ):
        """Start background processing with multiple workers"""
        self.processing = True
        
        # Create worker tasks
        workers = [
            asyncio.create_task(self._worker(processor_func, i))
            for i in range(worker_count)
        ]
        
        logger.info(f"Started {worker_count} processing workers")
        
        # Wait for all workers to complete
        await asyncio.gather(*workers)
        
        logger.info("All processing workers completed")
    
    async def _worker(self, processor_func: Callable[[T], Awaitable[R]], worker_id: int):
        """Worker coroutine for processing items"""
        while self.processing:
            try:
                # Get item with timeout
                item = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                
                # Process item
                start_time = time.perf_counter()
                try:
                    result = await processor_func(item)
                    processing_time = (time.perf_counter() - start_time) * 1000
                    
                    await self.results.put(ProcessingResult(
                        success=True,
                        result=result,
                        processing_time_ms=processing_time,
                        metadata={'worker_id': worker_id}
                    ))
                    
                    self._stats['successful'] += 1
                    
                except Exception as e:
                    processing_time = (time.perf_counter() - start_time) * 1000
                    
                    await self.results.put(ProcessingResult(
                        success=False,
                        error=str(e),
                        processing_time_ms=processing_time,
                        metadata={'worker_id': worker_id}
                    ))
                    
                    self._stats['failed'] += 1
                
                self._stats['processed'] += 1
                self.queue.task_done()
                
            except asyncio.TimeoutError:
                # No items in queue, continue
                continue
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {str(e)}")
    
    def stop_processing(self):
        """Stop background processing"""
        self.processing = False
    
    async def get_result(self, timeout: Optional[float] = None) -> Optional[ProcessingResult[R]]:
        """Get processed result"""
        try:
            if timeout:
                return await asyncio.wait_for(self.results.get(), timeout=timeout)
            else:
                return await self.results.get()
        except asyncio.TimeoutError:
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        return self._stats.copy()


# Utility functions for common processing patterns

async def process_files_parallel(
    file_ids: List[int],
    processor_func: Callable[[int], Awaitable[Any]],
    max_concurrency: int = 10,
    timeout_seconds: float = 30.0
) -> BatchProcessingResult:
    """Process files in parallel with optimized settings"""
    config = ProcessingConfig(
        max_concurrency=max_concurrency,
        timeout_seconds=timeout_seconds,
        strategy=ProcessingStrategy.ADAPTIVE,
        retry_attempts=1
    )
    
    processor = AsyncBatchProcessor[int, Any](config)
    return await processor.process_batch(file_ids, processor_func, "file")


async def process_patterns_batch(
    patterns: List[Dict[str, Any]],
    processor_func: Callable[[Dict[str, Any]], Awaitable[Any]],
    batch_size: int = 50
) -> BatchProcessingResult:
    """Process patterns in batches with optimized settings"""
    config = ProcessingConfig(
        max_concurrency=5,  # Lower concurrency for pattern processing
        batch_size=batch_size,
        strategy=ProcessingStrategy.BATCH_PARALLEL,
        timeout_seconds=60.0
    )
    
    processor = AsyncBatchProcessor[Dict[str, Any], Any](config)
    return await processor.process_batch(patterns, processor_func, "pattern")