import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Update this URL to your backend
  static const String baseUrl = 'https://mayor-foreign-neo-rebel.trycloudflare.com';

  Future<Map<String, dynamic>?> resolveLocation(double lat, double lon) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/address/location/resolve?lat=$lat&lon=$lon'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      print('API Error: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> getAddress(String pdaId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/address/$pdaId'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return null;
    } catch (e) {
      print('API Error: $e');
      return null;
    }
  }

  Future<List<dynamic>> searchAddresses(String query) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/address/search'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'query': query, 'limit': 20}),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['results'] ?? [];
      }
      return [];
    } catch (e) {
      print('API Error: $e');
      return [];
    }
  }

  Future<List<dynamic>> getZones() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/zones'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['zones'] ?? [];
      }
      return [];
    } catch (e) {
      print('API Error: $e');
      return [];
    }
  }
}
