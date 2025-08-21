#!/usr/bin/env python3
"""
Test the DIContainer LifetimeScope fix
"""

import sys
import os

# Add backend path
backend_path = os.path.join(os.path.dirname(__file__), 'app')
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

def test_lifetime_scope_access():
    """Test that LifetimeScope can be accessed correctly"""
    try:
        from app.infrastructure.container import DIContainer, LifetimeScope
        
        # Create container
        container = DIContainer()
        
        # Test that LifetimeScope enum works
        assert LifetimeScope.SINGLETON.value == "singleton"
        assert LifetimeScope.SCOPED.value == "scoped"
        assert LifetimeScope.TRANSIENT.value == "transient"
        
        # Test registering with different lifetimes
        class TestInterface:
            pass
        
        class TestImplementation:
            pass
        
        # These should all work without AttributeError
        container.register_singleton(TestInterface, TestImplementation)
        container.register_scoped(TestInterface, TestImplementation)  
        container.register_transient(TestInterface, TestImplementation)
        
        # Test factory registration with explicit lifetime
        container.register_factory(
            TestInterface,
            lambda: TestImplementation(),
            lifetime=LifetimeScope.SCOPED  # This was the problematic line
        )
        
        print("✅ LifetimeScope access test passed")
        return True
        
    except AttributeError as e:
        if "LifetimeScope" in str(e):
            print(f"❌ LifetimeScope AttributeError still present: {e}")
            return False
        else:
            # Different AttributeError, re-raise
            raise
    except Exception as e:
        print(f"❌ Other error occurred: {e}")
        return False

def test_configuration_import():
    """Test that configuration can be imported without LifetimeScope error"""
    try:
        # Mock the SQLAlchemy dependencies
        import sys
        from unittest.mock import Mock
        
        # Mock SQLAlchemy and other database dependencies
        sys.modules['sqlalchemy'] = Mock()
        sys.modules['sqlalchemy.orm'] = Mock()
        sys.modules['sqlalchemy.orm'].Session = Mock()
        sys.modules['app.core.database'] = Mock()
        sys.modules['app.core.database'].get_db = Mock()
        
        # Mock the domain modules
        sys.modules['app.domain'] = Mock()
        sys.modules['app.domain.pattern'] = Mock()
        sys.modules['app.domain.pattern.interfaces'] = Mock()
        sys.modules['app.domain.pattern.interfaces.pattern_extractor_interface'] = Mock()
        sys.modules['app.domain.pattern.interfaces.pattern_validator_interface'] = Mock()
        sys.modules['app.domain.pattern.services'] = Mock()
        sys.modules['app.domain.pattern.services.pattern_extraction_core'] = Mock()
        sys.modules['app.domain.pattern.services.pattern_matching_engine'] = Mock()
        sys.modules['app.domain.pattern.services.pattern_cache_manager'] = Mock()
        sys.modules['app.domain.pattern.services.pattern_facade_service'] = Mock()
        sys.modules['app.services'] = Mock()
        sys.modules['app.services.pattern_validation_service'] = Mock()
        sys.modules['app.core'] = Mock()
        sys.modules['app.core.security_validator'] = Mock()
        sys.modules['app.repositories'] = Mock()
        sys.modules['app.repositories.pattern_repository'] = Mock()
        
        # Now try to import the configuration
        from app.infrastructure.configuration import configure_pattern_domain_services
        
        print("✅ Configuration import test passed")
        return True
        
    except AttributeError as e:
        if "LifetimeScope" in str(e):
            print(f"❌ LifetimeScope AttributeError in configuration: {e}")
            return False
        else:
            print(f"❌ Other AttributeError in configuration: {e}")
            return False
    except Exception as e:
        print(f"❌ Other error in configuration import: {e}")
        return False

def main():
    """Run all tests"""
    print("🔧 Testing DIContainer LifetimeScope Fix\n")
    
    tests = [
        test_lifetime_scope_access,
        test_configuration_import
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
        print()
    
    print(f"📊 Test Results:")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 Fix successful! LifetimeScope AttributeError resolved.")
        return True
    else:
        print("\n⚠️  Fix incomplete. Please check the remaining issues.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)