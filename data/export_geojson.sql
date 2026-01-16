-- Export postal zones as GeoJSON for shapefile conversion
-- Run with: psql -d xeeno_map -f export_geojson.sql -o zones.geojson -t -A

SELECT json_build_object(
    'type', 'FeatureCollection',
    'name', 'Sierra Leone Postal Zones',
    'crs', json_build_object(
        'type', 'name',
        'properties', json_build_object('name', 'urn:ogc:def:crs:EPSG::4326')
    ),
    'features', json_agg(
        json_build_object(
            'type', 'Feature',
            'properties', json_build_object(
                'zone_code', zone_code,
                'postal_code', primary_code,
                'zone_name', zone_name,
                'region_code', region_code,
                'region_name', region_name,
                'district_code', district_code,
                'district_name', district_name,
                'segment_type', segment_type
            ),
            'geometry', ST_AsGeoJSON(geometry)::json
        )
    )
)
FROM postal_zones
WHERE geometry IS NOT NULL;
