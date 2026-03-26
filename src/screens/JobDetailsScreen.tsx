import React from 'react';
import { View, Text, Pressable, ScrollView, Linking, Image, Dimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../state/appStore';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 64) / 3; // 3 columns with padding

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetails'>;

export default function JobDetailsScreen({ navigation, route }: Props) {
  const { job } = route.params;
  const currentProfessional = useAppStore((s) => s.currentProfessional);

  if (!currentProfessional) {
    navigation.replace('ProfessionalAuth');
    return null;
  }

  const hasPurchased = job.interestedProfessionals.includes(currentProfessional.id);

  const handleCall = () => {
    if (hasPurchased) {
      Linking.openURL(`tel:${job.customerPhone}`);
    }
  };

  const handleEmail = () => {
    if (hasPurchased) {
      Linking.openURL(`mailto:${job.customerEmail}`);
    }
  };

  const totalArea = job.estimate?.request.rooms.reduce((sum, r) => sum + r.squareMeters, 0);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1">
        <View className="px-6 py-6">
          {/* Status Banner */}
          {hasPurchased ? (
            <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                <Text className="text-green-800 font-semibold ml-2 flex-1">
                  You have purchased this lead
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <View className="flex-row items-center">
                <Ionicons name="information-circle" size={24} color="#2563eb" />
                <Text className="text-blue-800 ml-2 flex-1">
                  Purchase this lead to view contact details
                </Text>
              </View>
            </View>
          )}

          {/* Header */}
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            {job.estimate ? `${job.estimate.request.rooms.length} Room Painting Project` : 'Job Details'}
          </Text>
          <View className="flex-row items-center mb-6">
            <Ionicons name="location" size={20} color="#6b7280" />
            <Text className="text-gray-600 ml-2 text-lg">{job.postcode ? job.postcode.toUpperCase() : 'Location'}</Text>
          </View>

          {/* Estimate Value (only if estimate exists) */}
          {job.estimate && (
            <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 mb-6">
              <Text className="text-sm font-medium text-green-800 mb-2">ESTIMATED VALUE</Text>
              <Text className="text-4xl font-bold text-green-600 mb-3">
                £{job.estimate.totalMinPrice} - £{job.estimate.totalMaxPrice}
              </Text>
              <Text className="text-green-700">
                For painting ceilings and walls in {job.estimate.request.rooms.length} room(s)
              </Text>
            </View>
          )}

          {/* Customer Contact (if purchased) */}
          {hasPurchased ? (
            <View className="bg-blue-600 rounded-2xl p-6 mb-6">
              <Text className="text-white text-lg font-semibold mb-4">Customer Contact</Text>
              
              <View className="bg-white bg-opacity-20 rounded-xl p-4 mb-3">
                <Text className="text-white text-opacity-80 text-sm mb-1">Name</Text>
                <Text className="text-white text-lg font-semibold">{job.customerName}</Text>
              </View>

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={handleCall}
                  className="flex-1 bg-white py-4 rounded-xl active:opacity-80 flex-row items-center justify-center"
                >
                  <Ionicons name="call" size={20} color="#2563eb" />
                  <Text className="text-blue-600 font-semibold ml-2">Call</Text>
                </Pressable>
                <Pressable
                  onPress={handleEmail}
                  className="flex-1 bg-white py-4 rounded-xl active:opacity-80 flex-row items-center justify-center"
                >
                  <Ionicons name="mail" size={20} color="#2563eb" />
                  <Text className="text-blue-600 font-semibold ml-2">Email</Text>
                </Pressable>
              </View>

              <View className="mt-4 bg-white bg-opacity-10 rounded-xl p-3">
                <Text className="text-white text-xs">
                  📧 {job.customerEmail}
                </Text>
                <Text className="text-white text-xs mt-1">
                  📱 {job.customerPhone}
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <View className="items-center py-4">
                <Ionicons name="lock-closed" size={48} color="#9ca3af" />
                <Text className="text-gray-600 text-center mt-3">
                  Customer contact details will be revealed after purchase
                </Text>
              </View>
            </View>
          )}

          {/* Project Details */}
          {job.estimate && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Project Details</Text>
              
              <View className="space-y-3">
                {totalArea && <DetailItem label="Total Area" value={`${totalArea} m²`} />}
                <DetailItem
                  label="Property Type"
                  value={
                    job.estimate.request.propertyType.charAt(0).toUpperCase() +
                    job.estimate.request.propertyType.slice(1)
                  }
                />
                <DetailItem
                  label="Number of Rooms"
                  value={job.estimate.request.rooms.length.toString()}
                />
                <DetailItem
                  label="Posted"
                  value={new Date(job.postedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
              </View>
            </View>
          )}

          {/* Room Breakdown */}
          {job.estimate && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Room Breakdown</Text>
              {job.estimate.request.rooms.map((room, index) => (
                <View
                  key={index}
                  className="flex-row justify-between items-center py-3 border-b border-gray-200"
                >
                  <View>
                    <Text className="text-gray-900 font-medium">Room {index + 1}</Text>
                    <Text className="text-gray-500 text-sm">
                      {room.length}m × {room.width}m
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-semibold">{room.squareMeters} m²</Text>
                </View>
              ))}
            </View>
          )}

          {/* Additional Items */}
          {job.estimate && (job.estimate.request.extras.doors > 0 ||
            job.estimate.request.extras.windows > 0 ||
            job.estimate.request.extras.skirtingBoardRooms > 0 ||
            job.estimate.request.extras.bannister) && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">Additional Items</Text>
              {job.estimate.request.extras.doors > 0 && (
                <Text className="text-gray-700 mb-2">
                  • {job.estimate.request.extras.doors} door(s) & frame(s)
                </Text>
              )}
              {job.estimate && job.estimate.request.extras.windows > 0 && (
                <Text className="text-gray-700 mb-2">
                  • {job.estimate.request.extras.windows} window(s)
                </Text>
              )}
              {job.estimate && job.estimate.request.extras.skirtingBoardRooms > 0 && (
                <Text className="text-gray-700 mb-2">
                  • Skirting boards in {job.estimate.request.extras.skirtingBoardRooms} room(s)
                </Text>
              )}
              {job.estimate && job.estimate.request.extras.bannister && (
                <Text className="text-gray-700">• Bannister</Text>
              )}
            </View>
          )}

          {/* Customer Description */}
          {job.description && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Customer Notes
              </Text>
              <Text className="text-gray-700 leading-6">{job.description}</Text>
            </View>
          )}

          {/* Room Photos */}
          {job.images && job.images.length > 0 && (
            <View className="bg-gray-50 rounded-2xl p-6 mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Room Photos
              </Text>
              <Text className="text-sm text-gray-600 mb-4">
                Customer provided {job.images.length} photo(s) of the room(s) to be painted
              </Text>
              <View className="flex-row flex-wrap">
                {job.images.map((uri, index) => (
                  <View
                    key={index}
                    style={{
                      width: IMAGE_SIZE,
                      height: IMAGE_SIZE,
                      marginRight: index % 3 === 2 ? 0 : 8,
                      marginBottom: 8,
                    }}
                  >
                    <Image
                      source={{ uri }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 8 }]}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Competition */}
          <View className="bg-yellow-50 rounded-xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="people" size={24} color="#f59e0b" />
              <View className="flex-1 ml-3">
                <Text className="font-semibold text-gray-900 mb-1">Competition</Text>
                <Text className="text-sm text-gray-700">
                  {job.interestedProfessionals.length} of {job.maxProfessionals} professionals
                  have purchased this lead
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-gray-600">{label}</Text>
      <Text className="text-gray-900 font-semibold">{value}</Text>
    </View>
  );
}
