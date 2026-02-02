import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:open_location_code/open_location_code.dart' as olc;

class LocationService extends ChangeNotifier {
  Position? _currentPosition;
  String? _plusCode;
  String? _plusCodeShort;
  bool _isLoading = false;
  String? _error;
  bool _permissionGranted = false;

  Position? get currentPosition => _currentPosition;
  String? get plusCode => _plusCode;
  String? get plusCodeShort => _plusCodeShort;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get permissionGranted => _permissionGranted;

  double? get latitude => _currentPosition?.latitude;
  double? get longitude => _currentPosition?.longitude;
  double? get accuracy => _currentPosition?.accuracy;

  Future<bool> checkAndRequestPermission() async {
    bool serviceEnabled;
    LocationPermission permission;

    // Check if location services are enabled
    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _error = 'Location services are disabled. Please enable them.';
      notifyListeners();
      return false;
    }

    // Check permission status
    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _error = 'Location permission denied.';
        notifyListeners();
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      _error = 'Location permissions are permanently denied. Please enable in settings.';
      notifyListeners();
      return false;
    }

    _permissionGranted = true;
    _error = null;
    notifyListeners();
    return true;
  }

  Future<void> getCurrentLocation() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Check permissions first
      final hasPermission = await checkAndRequestPermission();
      if (!hasPermission) {
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Get current position with high accuracy
      _currentPosition = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 0,
        ),
      );

      // Generate Plus Code
      if (_currentPosition != null) {
        _plusCode = olc.encode(
          _currentPosition!.latitude,
          _currentPosition!.longitude,
          codeLength: 11,
        );

        // Short code is last 6 characters (after removing first 4)
        if (_plusCode != null && _plusCode!.length >= 8) {
          final parts = _plusCode!.split('+');
          if (parts.length == 2 && parts[0].length >= 4) {
            _plusCodeShort = '${parts[0].substring(parts[0].length - 4)}+${parts[1]}';
          }
        }
      }

      _error = null;
    } catch (e) {
      _error = 'Failed to get location: $e';
      print('Location Error: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  void clearLocation() {
    _currentPosition = null;
    _plusCode = null;
    _plusCodeShort = null;
    _error = null;
    notifyListeners();
  }
}
