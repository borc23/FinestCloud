from marshmallow import Schema, fields, validate


class BoundsSchema(Schema):
    north = fields.Float(required=True)
    south = fields.Float(required=True)
    east = fields.Float(required=True)
    west = fields.Float(required=True)


class DetectSchema(Schema):
    image = fields.String(required=True)
    bounds = fields.Nested(BoundsSchema, required=True)


class DetectImageSchema(Schema):
    image = fields.String(required=True)
    bounds = fields.Nested(BoundsSchema, required=False)


class PanelModuleSchema(Schema):
    name = fields.String(required=True)
    value = fields.Dict(required=True)


class GeneratePanelsSchema(Schema):
    mapBounds = fields.Dict(required=True)
    resolution = fields.Float(required=True)
    module = fields.String(required=True)
    roofs = fields.List(fields.Dict(), required=True)
    objects = fields.List(fields.List(fields.Dict()), required=True)
    mapDimensions = fields.Dict(required=True)
    edge_padding_cm = fields.Integer(
        required=False, validate=validate.Range(min=0, max=200), load_default=20
    )
    selected_roofs_only = fields.Boolean(required=False, load_default=False)


class UpdatePanelCountSchema(Schema):
    panel_count = fields.Integer(required=True, validate=validate.Range(min=0))
    mapBounds = fields.Dict(required=True)
    resolution = fields.Float(required=False) or None


class UpdateMaxPanelCountSchema(Schema):
    max_panel_count = fields.Integer(required=True, validate=validate.Range(min=0))


class SolarApiSchema(Schema):
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
