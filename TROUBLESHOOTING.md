# Clear File Troubleshooting Guide

## 🔧 Common Issues and Solutions

### ✅ **RESOLVED: DIContainer LifetimeScope AttributeError**

**Issue**: `AttributeError: 'DIContainer' object has no attribute 'LifetimeScope`

**Root Cause**: Code was trying to access `container.LifetimeScope.SCOPED`, but `LifetimeScope` is a separate enum class, not an attribute of `DIContainer`.

**Solution**: 
```python
# ❌ BEFORE (Incorrect)
from app.infrastructure.container import DIContainer, configure_container
container.register_factory(
    Session,
    lambda: next(get_db()),
    lifetime=container.LifetimeScope.SCOPED  # ← Wrong: LifetimeScope not attribute of container
)

# ✅ AFTER (Fixed)  
from app.infrastructure.container import DIContainer, LifetimeScope, configure_container
container.register_factory(
    Session,
    lambda: next(get_db()),
    lifetime=LifetimeScope.SCOPED  # ← Correct: Use LifetimeScope enum directly
)
```

**Files Modified**:
- `app/infrastructure/configuration.py`: Added `LifetimeScope` import and fixed usage

**Prevention**: Always import enum classes separately when they're used outside their definition module.

---

## 🚨 Future Troubleshooting Patterns

### **Import/Module Issues**

**Symptoms**: `ModuleNotFoundError`, `ImportError`, `AttributeError`

**Diagnosis Steps**:
1. Check import statements for typos
2. Verify module paths exist
3. Ensure `__init__.py` files are present
4. Check for circular imports

**Tools**:
```bash
# Check syntax
python -m py_compile path/to/file.py

# Test import
python -c "from module import class_name; print('✅ Success')"

# Find missing imports
grep -r "from.*import" app/ | grep "missing_module"
```

### **Dependency Injection Issues**

**Symptoms**: Service resolution failures, lifecycle errors

**Diagnosis Steps**:
1. Verify service registration in configuration
2. Check interface implementations
3. Validate constructor dependencies
4. Test service health endpoint

**Debug Commands**:
```python
# Check registered services
container = get_container()
services = container.get_registered_services()
print(f"Registered services: {len(services)}")

# Test service resolution
try:
    service = container.resolve(ServiceInterface)
    print("✅ Service resolved successfully")
except Exception as e:
    print(f"❌ Service resolution failed: {e}")
```

### **Interface/Implementation Mismatches**

**Symptoms**: Method not implemented, signature mismatches

**Diagnosis Steps**:
1. Verify abstract method implementation
2. Check method signatures match interface
3. Validate return types
4. Test with mock implementations

### **Configuration Issues**

**Symptoms**: Services not properly wired, health check failures

**Diagnosis Steps**:
1. Check service configuration order
2. Verify dependency chains
3. Test with minimal configuration
4. Use health check endpoint

**Health Check**: `GET /health` endpoint shows service status:
```json
{
  "status": "healthy|degraded",
  "service": "clear-file-api", 
  "services": {
    "pattern_extractor": true,
    "pattern_matcher": true,
    "pattern_cache": true,
    "services_registered": 6
  }
}
```

---

## 📋 Quick Reference

### **Common Error Patterns**

| Error | Likely Cause | Quick Fix |
|-------|-------------|-----------|
| `AttributeError: 'X' object has no attribute 'Y'` | Missing import or wrong access pattern | Check imports and object structure |
| `ModuleNotFoundError: No module named 'X'` | Missing dependency or wrong path | Install package or fix import path |
| `Service X is not registered` | DI registration missing | Add service to configuration |
| `Circular dependency detected` | Services depend on each other | Refactor to use interfaces |

### **Diagnostic Commands**

```bash
# Test imports
python -c "from app.infrastructure.configuration import initialize_services"

# Check syntax  
find app/ -name "*.py" -exec python -m py_compile {} \;

# Test DI container
python test_container_fix.py

# Test architecture  
python test_simple_architecture.py

# Start server (debug mode)
uvicorn app.main:app --reload --log-level debug
```

### **Useful Debug Endpoints**

- `GET /health` - Service health status
- `GET /` - API information
- `GET /docs` - Interactive API documentation

---

## 🛠️ Development Tools

### **Testing Modular Architecture**
```bash
# Run architecture tests
python test_simple_architecture.py

# Test specific fixes
python test_container_fix.py

# Validate imports
python -c "from app.domain.pattern.services.pattern_extraction_core import PatternExtractionCore"
```

### **Code Quality Checks**
```bash
# Syntax validation
python -m py_compile app/**/*.py

# Import testing
python -c "import app.infrastructure.configuration"

# Type checking (if using mypy)
mypy app/ --ignore-missing-imports
```

This troubleshooting guide will help resolve similar issues in the future and provides systematic approaches for diagnosing modular architecture problems.