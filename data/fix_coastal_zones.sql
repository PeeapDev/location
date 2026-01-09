-- Fix coastal zone geometries to stay on land
-- These zones were extending into the Atlantic Ocean

-- Goderich - Southwest peninsula
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.290 8.405, -13.282 8.410, -13.275 8.402, -13.278 8.392, -13.288 8.388, -13.295 8.395, -13.290 8.405))'), 4326)
WHERE primary_code = '1158';

-- Hamilton - Stay on land
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.298 8.398, -13.290 8.405, -13.283 8.398, -13.286 8.388, -13.295 8.385, -13.302 8.392, -13.298 8.398))'), 4326)
WHERE primary_code = '1159';

-- Lakka - Inland from beach
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.305 8.392, -13.298 8.398, -13.290 8.390, -13.295 8.380, -13.305 8.378, -13.312 8.385, -13.305 8.392))'), 4326)
WHERE primary_code = '1160';

-- York - Peninsula village
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.312 8.385, -13.305 8.392, -13.298 8.385, -13.302 8.375, -13.312 8.372, -13.318 8.378, -13.312 8.385))'), 4326)
WHERE primary_code = '1161';

-- John Obey - Beach community (keep small, on land)
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.318 8.378, -13.312 8.385, -13.305 8.378, -13.308 8.368, -13.318 8.365, -13.325 8.372, -13.318 8.378))'), 4326)
WHERE primary_code = '1162';

-- Tokeh - Beach resort area
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.325 8.372, -13.318 8.378, -13.312 8.370, -13.315 8.360, -13.325 8.358, -13.332 8.365, -13.325 8.372))'), 4326)
WHERE primary_code = '1163';

-- River Number Two - Beach community
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.332 8.365, -13.325 8.372, -13.318 8.365, -13.322 8.355, -13.332 8.352, -13.338 8.358, -13.332 8.365))'), 4326)
WHERE primary_code = '1164';

-- Sussex - Small peninsula village
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.338 8.358, -13.332 8.365, -13.325 8.358, -13.328 8.348, -13.338 8.345, -13.345 8.352, -13.338 8.358))'), 4326)
WHERE primary_code = '1165';

-- Kent - Southern tip village
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.345 8.352, -13.338 8.358, -13.332 8.350, -13.335 8.340, -13.345 8.338, -13.352 8.345, -13.345 8.352))'), 4326)
WHERE primary_code = '1166';

-- Bureh - Beach community (fix to be on land)
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.352 8.345, -13.345 8.352, -13.338 8.345, -13.342 8.335, -13.352 8.332, -13.358 8.338, -13.352 8.345))'), 4326)
WHERE primary_code = '1167';

-- Also fix some other coastal zones that might extend into water

-- Lumley Beach
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.278 8.418, -13.270 8.422, -13.265 8.415, -13.268 8.405, -13.278 8.402, -13.285 8.410, -13.278 8.418))'), 4326)
WHERE primary_code = '1156';

-- Aberdeen Beach
UPDATE zones SET geometry = ST_SetSRID(ST_GeomFromText('POLYGON((-13.285 8.410, -13.278 8.418, -13.270 8.410, -13.275 8.400, -13.285 8.398, -13.292 8.405, -13.285 8.410))'), 4326)
WHERE primary_code = '1157';

-- Verify updates
SELECT primary_code, name, ST_AsText(ST_Centroid(geometry)) as center
FROM zones
WHERE primary_code IN ('1156', '1157', '1158', '1159', '1160', '1161', '1162', '1163', '1164', '1165', '1166', '1167')
ORDER BY primary_code;
