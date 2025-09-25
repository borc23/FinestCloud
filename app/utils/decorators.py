import functools
import logging
from typing import Any, Callable, Tuple, Union

from flask import Response, jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import BadRequest

from app.utils.exceptions import APIRequestError, CacheDataError, SessionDataError
from app.utils.request_context import add_request_context, get_request_id

logger = logging.getLogger(__name__)


def handle_exceptions(f: Callable) -> Callable:
    """
    Decorator to handle exceptions in route handlers.
    Returns appropriate JSON responses with status codes and request context.
    """

    @functools.wraps(f)
    def decorated_function(
        *args: Any, **kwargs: Any
    ) -> Union[Response, Tuple[Response, int]]:
        request_id = get_request_id()

        try:
            return f(*args, **kwargs)
        except ValidationError as err:
            error_msg = f"Validation error: {err.messages}"
            if request_id:
                error_msg += f" (Request: {request_id})"
            logger.error(error_msg)

            response_data = add_request_context(
                {
                    "success": False,
                    "error": "Validation failed",
                    "details": err.messages,
                }
            )
            return jsonify(response_data), 400

        except SessionDataError as err:
            error_msg = f"Session data error: {str(err)}"
            if request_id:
                error_msg += f" (Request: {request_id})"
            logger.error(error_msg)

            response_data = add_request_context({"success": False, "error": str(err)})
            return jsonify(response_data), 400

        except CacheDataError as err:
            error_msg = f"Cache data error: {str(err)}"
            if request_id:
                error_msg += f" (Request: {request_id})"
            logger.error(error_msg)

            response_data = add_request_context({"success": False, "error": str(err)})
            return jsonify(response_data), 400

        except APIRequestError as err:
            error_msg = f"API request error: {str(err)}"
            if request_id:
                error_msg += f" (Request: {request_id})"
            logger.error(error_msg)

            response_data = add_request_context({"success": False, "error": str(err)})
            return jsonify(response_data), 502

        except BadRequest as err:
            error_msg = f"Bad request: {str(err)}"
            if request_id:
                error_msg += f" (Request: {request_id})"
            logger.error(error_msg)

            response_data = add_request_context({"success": False, "error": str(err)})
            return jsonify(response_data), 400

        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            if request_id:
                error_msg += f" (Request: {request_id})"
            logger.exception(error_msg)

            response_data = add_request_context(
                {"success": False, "error": "Internal server error"}
            )
            return jsonify(response_data), 500

    return decorated_function
