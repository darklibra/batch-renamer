#!/usr/bin/env python3
"""
Clear File System - Backend Test Script
Quick verification that all dependencies are installed and working correctly
"""

import sys
import os
import subprocess
import tempfile
from pathlib import Path

def test_imports():
    """Test all critical imports"""
    print("🔧 Testing critical imports...")
    
    try:
        # Test pydantic-settings
        from pydantic_settings import BaseSettings
        print("✅ pydantic-settings import successful")
        
        # Test configuration system
        from app.core.config import get_settings, Settings, Environment
        print("✅ Configuration system import successful")
        
        # Test database system
        from app.core.database import get_db, engine
        print("✅ Database system import successful")
        
        # Test FastAPI imports
        from app.main import app
        print("✅ FastAPI application import successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_configuration():
    """Test configuration loading and validation"""
    print("🔧 Testing configuration...")
    
    try:
        from app.core.config import get_settings, validate_environment
        
        # Test basic settings loading
        settings = get_settings()
        print(f"✅ Settings loaded: {settings.app_name}")
        print(f"✅ Environment: {settings.environment}")
        print(f"✅ API Prefix: {settings.api_prefix}")
        print(f"✅ Database URL: {settings.database_url[:20]}...")
        
        # Test environment validation
        if validate_environment():
            print("✅ Environment validation passed")
        else:
            print("⚠️ Environment validation issues detected")
        
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def test_database():
    """Test database connectivity"""
    print("🔧 Testing database connectivity...")
    
    try:
        from app.core.database import engine
        from sqlalchemy import text
        
        # Test database connection
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            if result.fetchone()[0] == 1:
                print("✅ Database connection successful")
            else:
                print("❌ Database query returned unexpected result")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_api_startup():
    """Test API server startup"""
    print("🔧 Testing API server startup...")
    
    try:
        # Start server in background
        process = subprocess.Popen([
            sys.executable, "-m", "uvicorn", "app.main:app",
            "--host", "127.0.0.1", "--port", "8001", "--timeout-keep-alive", "5"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for startup
        import time
        time.sleep(3)
        
        # Test if server is responding
        import urllib.request
        try:
            response = urllib.request.urlopen("http://127.0.0.1:8001/")
            data = response.read().decode()
            if "Welcome to Clear File API" in data:
                print("✅ API server startup successful")
                print("✅ Root endpoint responding correctly")
                success = True
            else:
                print("❌ API server responding but with unexpected content")
                success = False
        except Exception as e:
            print(f"❌ API server not responding: {e}")
            success = False
        finally:
            # Clean up process
            process.terminate()
            process.wait(timeout=5)
        
        return success
        
    except Exception as e:
        print(f"❌ API startup test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Clear File Backend Test Suite")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent.parent / "backend"
    os.chdir(backend_dir)
    
    # Add current directory to Python path
    sys.path.insert(0, str(backend_dir))
    
    tests = [
        ("Import Tests", test_imports),
        ("Configuration Tests", test_configuration),
        ("Database Tests", test_database),
        ("API Startup Tests", test_api_startup),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}")
        print("-" * 30)
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is ready.")
        return 0
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())