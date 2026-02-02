/**
 * History Screen - View and manage saved locations
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocationStore, useSettingsStore, type SavedLocation } from '@/stores';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface LocationItemProps {
  location: SavedLocation;
  onCopy: (code: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

function LocationItem({ location, onCopy, onDelete, onToggleFavorite }: LocationItemProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete this location?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(location.id) },
      ]
    );
  };

  return (
    <View style={styles.itemContainer}>
      <View style={styles.itemHeader}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite(location.id)}
        >
          <Text style={styles.favoriteIcon}>{location.isFavorite ? '\u2605' : '\u2606'}</Text>
        </TouchableOpacity>
        <Text style={styles.itemDate}>{formatDate(location.createdAt)}</Text>
      </View>

      <TouchableOpacity style={styles.codeButton} onPress={() => onCopy(location.plusCode)}>
        <Text style={styles.codeText}>{location.plusCode}</Text>
      </TouchableOpacity>

      {location.shortCode && (
        <Text style={styles.shortCode}>Short: {location.shortCode}</Text>
      )}

      {location.name && <Text style={styles.name}>{location.name}</Text>}

      <View style={styles.itemFooter}>
        <Text style={styles.accuracy}>Accuracy: ±{location.accuracy.toFixed(0)}m</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { savedLocations, deleteLocation, toggleFavorite, clearAllLocations } = useLocationStore();
  const enableHaptics = useSettingsStore((state) => state.enableHaptics);

  const handleCopy = useCallback(
    async (code: string) => {
      await Clipboard.setStringAsync(code);
      if (enableHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert('Copied!', 'Plus Code copied to clipboard');
    },
    [enableHaptics]
  );

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Locations',
      'Are you sure you want to delete all saved locations? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAllLocations },
      ]
    );
  };

  // Sort: favorites first, then by date
  const sortedLocations = [...savedLocations].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1;
    }
    return b.createdAt - a.createdAt;
  });

  if (savedLocations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>\uD83D\uDCCD</Text>
        <Text style={styles.emptyTitle}>No Saved Locations</Text>
        <Text style={styles.emptyText}>
          Save locations from the main screen to see them here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{savedLocations.length} Locations</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearAllText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedLocations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LocationItem
            location={item}
            onCopy={handleCopy}
            onDelete={deleteLocation}
            onToggleFavorite={toggleFavorite}
          />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  clearAllText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  favoriteButton: {
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 20,
    color: '#F59E0B',
  },
  itemDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  codeButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
    fontFamily: 'monospace',
  },
  shortCode: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  accuracy: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F3F4F6',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
