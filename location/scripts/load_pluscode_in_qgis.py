"""
PyQGIS Script - Run in QGIS Python Console (Ctrl+Alt+P)

Loads the Plus Code grid and applies styling.
Copy and paste this entire script into the QGIS Python Console.
"""

# Path to the generated GeoJSON
geojson_path = "C:/Users/PC/Desktop/Project/postal/location/data/freetown_pluscode_grid.geojson"

# Load the layer
layer = QgsVectorLayer(geojson_path, "Freetown Plus Codes", "ogr")

if not layer.isValid():
    print(f"ERROR: Could not load layer from {geojson_path}")
else:
    # Add to project
    QgsProject.instance().addMapLayer(layer)

    # Create categorized styling by zone_type
    categories = []

    # Urban style - blue
    urban_symbol = QgsFillSymbol.createSimple({
        'color': '65,105,225,100',  # Royal blue, semi-transparent
        'outline_color': '0,0,139,200',  # Dark blue outline
        'outline_width': '0.2'
    })
    categories.append(QgsRendererCategory('urban', urban_symbol, 'Urban'))

    # Rural style - green
    rural_symbol = QgsFillSymbol.createSimple({
        'color': '34,139,34,100',  # Forest green, semi-transparent
        'outline_color': '0,100,0,200',  # Dark green outline
        'outline_width': '0.2'
    })
    categories.append(QgsRendererCategory('rural', rural_symbol, 'Rural'))

    # Apply categorized renderer
    renderer = QgsCategorizedSymbolRenderer('zone_type', categories)
    layer.setRenderer(renderer)

    # Enable labels with Plus Code
    label_settings = QgsPalLayerSettings()
    label_settings.fieldName = 'local_code'
    label_settings.enabled = True

    text_format = QgsTextFormat()
    text_format.setSize(7)
    text_format.setColor(QColor(0, 0, 0))
    label_settings.setFormat(text_format)

    # Only show labels at certain zoom levels
    label_settings.scaleVisibility = True
    label_settings.minimumScale = 5000  # Show when zoomed in

    labeling = QgsVectorLayerSimpleLabeling(label_settings)
    layer.setLabelsEnabled(True)
    layer.setLabeling(labeling)

    # Refresh
    layer.triggerRepaint()

    # Zoom to layer
    iface.setActiveLayer(layer)
    iface.zoomToActiveLayer()

    print(f"SUCCESS: Loaded {layer.featureCount()} Plus Code polygons")
    print("Layer styled by zone_type (urban=blue, rural=green)")
    print("Labels show local_code when zoomed in")
