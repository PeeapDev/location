import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/location_service.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MapController _mapController = MapController();
  Map<String, dynamic>? _addressData;
  bool _isLoadingAddress = false;

  @override
  void initState() {
    super.initState();
    // Get location on startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _getLocation();
    });
  }

  Future<void> _getLocation() async {
    final locationService = context.read<LocationService>();
    await locationService.getCurrentLocation();

    if (locationService.currentPosition != null) {
      _mapController.move(
        LatLng(
          locationService.latitude!,
          locationService.longitude!,
        ),
        16,
      );
      _lookupAddress();
    }
  }

  Future<void> _lookupAddress() async {
    final locationService = context.read<LocationService>();
    final apiService = context.read<ApiService>();

    if (locationService.latitude == null || locationService.longitude == null) {
      return;
    }

    setState(() {
      _isLoadingAddress = true;
    });

    try {
      final result = await apiService.resolveLocation(
        locationService.latitude!,
        locationService.longitude!,
      );

      setState(() {
        _addressData = result;
        _isLoadingAddress = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingAddress = false;
      });
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Copied: $text'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Xeeno Map'),
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _getLocation,
            tooltip: 'Refresh Location',
          ),
        ],
      ),
      body: Consumer<LocationService>(
        builder: (context, locationService, child) {
          return Column(
            children: [
              // Map
              Expanded(
                flex: 2,
                child: FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: LatLng(
                      locationService.latitude ?? 8.4657,
                      locationService.longitude ?? -13.2317,
                    ),
                    initialZoom: 16,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.xeenomap.mobile',
                    ),
                    if (locationService.currentPosition != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: LatLng(
                              locationService.latitude!,
                              locationService.longitude!,
                            ),
                            width: 40,
                            height: 40,
                            child: const Icon(
                              Icons.location_pin,
                              color: Colors.red,
                              size: 40,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ),

              // Info Panel
              Expanded(
                flex: 2,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status
                        if (locationService.isLoading)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(20),
                              child: CircularProgressIndicator(),
                            ),
                          )
                        else if (locationService.error != null)
                          _buildErrorCard(locationService.error!)
                        else if (locationService.currentPosition != null)
                          _buildLocationInfo(locationService),

                        // Address Info from API
                        if (_isLoadingAddress)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.all(10),
                              child: Text('Looking up address...'),
                            ),
                          )
                        else if (_addressData != null)
                          _buildAddressInfo(),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _getLocation,
        icon: const Icon(Icons.my_location),
        label: const Text('Get Location'),
      ),
    );
  }

  Widget _buildErrorCard(String error) {
    return Card(
      color: Colors.red.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red.shade700),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                error,
                style: TextStyle(color: Colors.red.shade700),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationInfo(LocationService locationService) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Plus Code (Main)
            if (locationService.plusCode != null) ...[
              const Text(
                'Plus Code',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              InkWell(
                onTap: () => _copyToClipboard(locationService.plusCode!),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        locationService.plusCode!,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy),
                      onPressed: () => _copyToClipboard(locationService.plusCode!),
                      tooltip: 'Copy Plus Code',
                    ),
                  ],
                ),
              ),
              const Divider(height: 24),
            ],

            // Coordinates
            Row(
              children: [
                Expanded(
                  child: _buildInfoItem(
                    'Latitude',
                    locationService.latitude?.toStringAsFixed(6) ?? '-',
                  ),
                ),
                Expanded(
                  child: _buildInfoItem(
                    'Longitude',
                    locationService.longitude?.toStringAsFixed(6) ?? '-',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoItem(
              'Accuracy',
              '±${locationService.accuracy?.toStringAsFixed(1) ?? '-'} meters',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressInfo() {
    final nearestAddresses = _addressData?['nearest_addresses'] as List?;

    if (nearestAddresses == null || nearestAddresses.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('No registered addresses nearby'),
        ),
      );
    }

    final nearest = nearestAddresses.first;

    return Card(
      color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Nearest Registered Address',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () => _copyToClipboard(nearest['pda_id'] ?? ''),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      nearest['pda_id'] ?? 'Unknown',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 20),
                    onPressed: () => _copyToClipboard(nearest['pda_id'] ?? ''),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.straighten, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 4),
                Text(
                  '${nearest['distance_m']?.toStringAsFixed(1) ?? '-'} meters away',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
                const SizedBox(width: 16),
                Icon(Icons.explore, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 4),
                Text(
                  nearest['bearing'] ?? '-',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
