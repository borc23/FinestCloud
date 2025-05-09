import functools
import logging
from typing import Any, Callable, Tuple, Union

from flask import Response, jsonify
from marshmallow import ValidationError
from werkzeug.exceptions import BadRequest

from app.utils.exceptions import APIRequestError, CacheDataError, SessionDataError

logger = logging.getLogger(__name__)


def handle_exceptions(f: Callable) -> Callable:
    """
    Decorator to handle exceptions in route handlers.
    Returns appropriate JSON responses with status codes.
    """

    @functools.wraps(f)
    def decorated_function(
        *args: Any, **kwargs: Any
    ) -> Union[Response, Tuple[Response, int]]:
        try:
            return f(*args, **kwargs)
        except ValidationError as err:
            logger.error(f"Validation error: {err.messages}")
            return jsonify({"success": False, "error": err.messages}), 400
        except SessionDataError as err:
            logger.error(f"Session data error: {str(err)}")
            return jsonify({"success": False, "error": str(err)}), 400
        except CacheDataError as err:
            logger.error(f"Cache data error: {str(err)}")
            return jsonify({"success": False, "error": str(err)}), 400
        except APIRequestError as err:
            logger.error(f"API request error: {str(err)}")
            return jsonify({"success": False, "error": str(err)}), 502
        except BadRequest as err:
            logger.error(f"Bad request: {str(err)}")
            return jsonify({"success": False, "error": str(err)}), 400
        except Exception as e:
            logger.exception(f"Unexpected error: {str(e)}")
            return jsonify({"success": False, "error": "Internal server error"}), 500

    return decorated_function
