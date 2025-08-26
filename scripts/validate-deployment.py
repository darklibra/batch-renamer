#!/usr/bin/env python3
"""
Clear File System - Deployment Validation Suite
Comprehensive testing and validation for production deployments.
"""

import asyncio
import aiohttp
import argparse
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path
import subprocess
import psutil

@dataclass
class ValidationResult:
    """Result of a validation test."""
    name: str
    passed: bool
    message: str
    duration: float
    details: Optional[Dict[str, Any]] = None

class ValidationSuite:
    """Comprehensive validation suite for Clear File System."""
    
    def __init__(self, base_url: str = "http://localhost:8000", environment: str = "development"):
        self.base_url = base_url.rstrip('/')
        self.environment = environment
        self.results: List[ValidationResult] = []
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()
    
    def log_result(self, result: ValidationResult):
        """Log validation result."""
        status = "✅ PASS" if result.passed else "❌ FAIL"
        print(f"{status} {result.name} ({result.duration:.2f}s)")
        if not result.passed:
            print(f"   └─ {result.message}")
        if result.details:
            print(f"   └─ Details: {json.dumps(result.details, indent=6)}")
        
        self.results.append(result)
    
    async def test_basic_connectivity(self) -> ValidationResult:
        """Test basic API connectivity."""
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/", timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return ValidationResult(
                        name="Basic API Connectivity",
                        passed=True,
                        message=f"API is responding: {data.get('message', 'OK')}",
                        duration=time.time() - start_time,
                        details=data
                    )
                else:
                    return ValidationResult(
                        name="Basic API Connectivity",
                        passed=False,
                        message=f"API returned status {response.status}",
                        duration=time.time() - start_time
                    )
        except Exception as e:
            return ValidationResult(
                name="Basic API Connectivity",
                passed=False,
                message=f"Connection failed: {str(e)}",
                duration=time.time() - start_time
            )
    
    async def test_health_endpoint(self) -> ValidationResult:
        """Test health check endpoint."""
        start_time = time.time()
        
        try:
            async with self.session.get(f"{self.base_url}/api/v1/monitoring/health", timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Validate health check structure
                    required_fields = ['status', 'timestamp', 'components', 'performance']
                    missing_fields = [field for field in required_fields if field not in data]
                    
                    if missing_fields:
                        return ValidationResult(
                            name="Health Check Structure",
                            passed=False,
                            message=f"Missing required fields: {missing_fields}",
                            duration=time.time() - start_time
                        )
                    
                    # Check component health
                    unhealthy_components = []
                    for component, status in data.get('components', {}).items():
                        if status.get('status') != 'healthy':
                            unhealthy_components.append(component)
                    
                    if unhealthy_components:
                        return ValidationResult(
                            name="Health Check",
                            passed=False,
                            message=f"Unhealthy components: {unhealthy_components}",
                            duration=time.time() - start_time,
                            details=data
                        )
                    
                    return ValidationResult(
                        name="Health Check",
                        passed=True,
                        message=f"All systems healthy: {data['status']}",
                        duration=time.time() - start_time,
                        details=data
                    )
                else:
                    return ValidationResult(
                        name="Health Check",
                        passed=False,
                        message=f"Health endpoint returned status {response.status}",
                        duration=time.time() - start_time
                    )
        except Exception as e:
            return ValidationResult(
                name="Health Check",
                passed=False,
                message=f"Health check failed: {str(e)}",
                duration=time.time() - start_time
            )
    
    async def test_database_connectivity(self) -> ValidationResult:
        """Test database connectivity and operations."""
        start_time = time.time()
        
        try:
            # Test readiness endpoint (includes DB check)
            async with self.session.get(f"{self.base_url}/api/v1/monitoring/readiness", timeout=10) as response:
                if response.status == 200:
                    # Test basic database operations
                    async with self.session.get(f"{self.base_url}/api/v1/files", timeout=10) as files_response:
                        if files_response.status in [200, 404]:  # 404 is OK if no files exist
                            return ValidationResult(
                                name="Database Connectivity",
                                passed=True,
                                message="Database operations working",
                                duration=time.time() - start_time
                            )
                        else:
                            return ValidationResult(
                                name="Database Connectivity",
                                passed=False,
                                message=f"Database operations failed: {files_response.status}",
                                duration=time.time() - start_time
                            )
                else:
                    return ValidationResult(
                        name="Database Connectivity",
                        passed=False,
                        message=f"Readiness check failed: {response.status}",
                        duration=time.time() - start_time
                    )
        except Exception as e:
            return ValidationResult(
                name="Database Connectivity",
                passed=False,
                message=f"Database connectivity test failed: {str(e)}",
                duration=time.time() - start_time
            )
    
    async def test_api_endpoints(self) -> ValidationResult:
        """Test core API endpoints."""
        start_time = time.time()
        
        endpoints_to_test = [
            ("/api/v1/files", "GET"),
            ("/api/v1/patterns", "GET"),
            ("/api/v1/system/overview", "GET"),
            ("/api/v1/monitoring/metrics/system", "GET"),
        ]
        
        failed_endpoints = []
        
        try:
            for endpoint, method in endpoints_to_test:
                async with self.session.request(method, f"{self.base_url}{endpoint}", timeout=10) as response:
                    if response.status not in [200, 404]:  # 404 is acceptable for empty collections
                        failed_endpoints.append(f"{method} {endpoint}: {response.status}")
            
            if failed_endpoints:
                return ValidationResult(
                    name="API Endpoints",
                    passed=False,
                    message=f"Failed endpoints: {failed_endpoints}",
                    duration=time.time() - start_time
                )
            else:
                return ValidationResult(
                    name="API Endpoints",
                    passed=True,
                    message=f"All {len(endpoints_to_test)} core endpoints responding",
                    duration=time.time() - start_time
                )
        
        except Exception as e:
            return ValidationResult(
                name="API Endpoints",
                passed=False,
                message=f"API endpoint testing failed: {str(e)}",
                duration=time.time() - start_time
            )
    
    async def test_performance_benchmarks(self) -> ValidationResult:
        """Test system performance against benchmarks."""
        start_time = time.time()
        
        try:
            # Test response time
            response_times = []
            for _ in range(5):
                test_start = time.time()
                async with self.session.get(f"{self.base_url}/api/v1/monitoring/health", timeout=10) as response:
                    if response.status == 200:
                        response_times.append(time.time() - test_start)
                await asyncio.sleep(0.1)
            
            avg_response_time = sum(response_times) / len(response_times)
            max_response_time = max(response_times)
            
            # Performance thresholds
            warning_threshold = 2.0  # seconds
            error_threshold = 5.0    # seconds
            
            if max_response_time > error_threshold:
                return ValidationResult(
                    name="Performance Benchmarks",
                    passed=False,
                    message=f"Unacceptable response time: {max_response_time:.2f}s (max allowed: {error_threshold}s)",
                    duration=time.time() - start_time,
                    details={
                        "avg_response_time": avg_response_time,
                        "max_response_time": max_response_time,
                        "all_response_times": response_times
                    }
                )
            elif max_response_time > warning_threshold:
                return ValidationResult(
                    name="Performance Benchmarks",
                    passed=True,
                    message=f"Warning: Slow response time: {max_response_time:.2f}s (warning threshold: {warning_threshold}s)",
                    duration=time.time() - start_time,
                    details={
                        "avg_response_time": avg_response_time,
                        "max_response_time": max_response_time
                    }
                )
            else:
                return ValidationResult(
                    name="Performance Benchmarks",
                    passed=True,
                    message=f"Good performance: avg {avg_response_time:.2f}s, max {max_response_time:.2f}s",
                    duration=time.time() - start_time,
                    details={
                        "avg_response_time": avg_response_time,
                        "max_response_time": max_response_time
                    }
                )
        
        except Exception as e:
            return ValidationResult(
                name="Performance Benchmarks",
                passed=False,
                message=f"Performance testing failed: {str(e)}",
                duration=time.time() - start_time
            )
    
    def test_system_resources(self) -> ValidationResult:
        """Test system resource usage."""
        start_time = time.time()
        
        try:
            # Check system resources
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            issues = []
            
            # Resource thresholds
            if cpu_percent > 90:
                issues.append(f"High CPU usage: {cpu_percent}%")
            
            if memory.percent > 90:
                issues.append(f"High memory usage: {memory.percent}%")
            
            if (disk.used / disk.total) * 100 > 90:
                issues.append(f"High disk usage: {(disk.used / disk.total) * 100:.1f}%")
            
            if issues:
                return ValidationResult(
                    name="System Resources",
                    passed=False,
                    message=f"Resource warnings: {issues}",
                    duration=time.time() - start_time,
                    details={
                        "cpu_percent": cpu_percent,
                        "memory_percent": memory.percent,
                        "disk_usage_percent": (disk.used / disk.total) * 100
                    }
                )
            else:
                return ValidationResult(
                    name="System Resources",
                    passed=True,
                    message=f"System resources OK: CPU {cpu_percent}%, Memory {memory.percent}%",
                    duration=time.time() - start_time,
                    details={
                        "cpu_percent": cpu_percent,
                        "memory_percent": memory.percent,
                        "disk_usage_percent": (disk.used / disk.total) * 100
                    }
                )
        
        except Exception as e:
            return ValidationResult(
                name="System Resources",
                passed=False,
                message=f"System resource check failed: {str(e)}",
                duration=time.time() - start_time
            )
    
    def test_docker_containers(self) -> ValidationResult:
        """Test Docker container status."""
        start_time = time.time()
        
        try:
            # Check if docker-compose is running
            result = subprocess.run(['docker-compose', 'ps'], capture_output=True, text=True, cwd=Path(__file__).parent.parent)
            
            if result.returncode != 0:
                return ValidationResult(
                    name="Docker Containers",
                    passed=False,
                    message="Docker Compose not running or not accessible",
                    duration=time.time() - start_time
                )
            
            # Parse container status
            lines = result.stdout.strip().split('\n')
            if len(lines) < 2:  # Header + at least one container
                return ValidationResult(
                    name="Docker Containers",
                    passed=False,
                    message="No containers found",
                    duration=time.time() - start_time
                )
            
            unhealthy_containers = []
            container_info = []
            
            for line in lines[1:]:  # Skip header
                parts = line.split()
                if len(parts) >= 4:
                    container_name = parts[0]
                    status = " ".join(parts[3:])
                    container_info.append({"name": container_name, "status": status})
                    
                    if "Up" not in status:
                        unhealthy_containers.append(f"{container_name}: {status}")
            
            if unhealthy_containers:
                return ValidationResult(
                    name="Docker Containers",
                    passed=False,
                    message=f"Unhealthy containers: {unhealthy_containers}",
                    duration=time.time() - start_time,
                    details={"containers": container_info}
                )
            else:
                return ValidationResult(
                    name="Docker Containers",
                    passed=True,
                    message=f"All {len(container_info)} containers running",
                    duration=time.time() - start_time,
                    details={"containers": container_info}
                )
        
        except subprocess.CalledProcessError as e:
            return ValidationResult(
                name="Docker Containers",
                passed=False,
                message=f"Docker command failed: {e}",
                duration=time.time() - start_time
            )
        except Exception as e:
            return ValidationResult(
                name="Docker Containers",
                passed=False,
                message=f"Container status check failed: {str(e)}",
                duration=time.time() - start_time
            )
    
    async def run_all_tests(self):
        """Run all validation tests."""
        print(f"🚀 Starting validation suite for {self.environment} environment")
        print(f"🌐 Base URL: {self.base_url}")
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 60)
        
        # Run async tests
        async_tests = [
            self.test_basic_connectivity(),
            self.test_health_endpoint(),
            self.test_database_connectivity(),
            self.test_api_endpoints(),
            self.test_performance_benchmarks(),
        ]
        
        for test_coro in async_tests:
            result = await test_coro
            self.log_result(result)
        
        # Run sync tests
        sync_tests = [
            self.test_system_resources(),
            self.test_docker_containers(),
        ]
        
        for test_func in sync_tests:
            result = test_func
            self.log_result(result)
    
    def generate_report(self):
        """Generate validation report."""
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if result.passed)
        failed_tests = total_tests - passed_tests
        
        print("\n" + "=" * 60)
        print("📊 VALIDATION REPORT")
        print("=" * 60)
        print(f"📈 Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"🎯 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if not result.passed:
                    print(f"   • {result.name}: {result.message}")
        
        print(f"\n⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Return exit code
        return 0 if failed_tests == 0 else 1

async def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Clear File System Deployment Validation")
    parser.add_argument('--base-url', default='http://localhost:8000', help='Base URL for API testing')
    parser.add_argument('--environment', default='development', choices=['development', 'staging', 'production'], help='Environment being tested')
    
    args = parser.parse_args()
    
    async with ValidationSuite(args.base_url, args.environment) as validator:
        await validator.run_all_tests()
        exit_code = validator.generate_report()
        sys.exit(exit_code)

if __name__ == "__main__":
    asyncio.run(main())