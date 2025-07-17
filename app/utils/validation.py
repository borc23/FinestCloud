"""
Request validation decorators and utilities.

This module provides decorators and utilities for validating incoming
requests against defined schemas with proper error handling.
"""

from functools import wraps
from typing import Type, Any, Dict

from flask import request, jsonify
from marshmallow import ValidationError, Schema


def validate_json_schema(schema_class: Type[Schema]):
    """
    Decorator to validate JSON request data against a schema.
    
    Args:
        schema_class: Marshmallow schema class to validate against
        
    Returns:
        Decorator function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                schema = schema_class()
                validated_data = schema.load(request.get_json() or {})
                request.validated_data = validated_data
                return f(*args, **kwargs)
            except ValidationError as e:
                return jsonify({
                    "success": False, 
                    "error": "Validation failed",
                    "details": e.messages
                }), 400
        return decorated_function
    return decorator


def validate_query_params(schema_class: Type[Schema]):
    """
    Decorator to validate query parameters against a schema.
    
    Args:
        schema_class: Marshmallow schema class to validate against
        
    Returns:
        Decorator function
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                schema = schema_class()
                validated_data = schema.load(request.args)
                request.validated_params = validated_data
                return f(*args, **kwargs)
            except ValidationError as e:
                return jsonify({
                    "success": False, 
                    "error": "Query parameter validation failed",
                    "details": e.messages
                }), 400
        return decorated_function
    return decorator


class RequestValidator:
    """Utility class for request validation operations."""
    
    @staticmethod
    def validate_data(data: Dict[str, Any], schema_class: Type[Schema]) -> Dict[str, Any]:
        """
        Validate data against a schema and return validated data.
        
        Args:
            data: Data to validate
            schema_class: Schema class to validate against
            
        Returns:
            Validated data
            
        Raises:
            ValidationError: If validation fails
        """
        schema = schema_class()
        return schema.load(data)
    
    @staticmethod
    def validate_json_request(schema_class: Type[Schema]) -> Dict[str, Any]:
        """
        Validate current request JSON data against a schema.
        
        Args:
            schema_class: Schema class to validate against
            
        Returns:
            Validated data
            
        Raises:
            ValidationError: If validation fails
        """
        return RequestValidator.validate_data(request.get_json() or {}, schema_class)
