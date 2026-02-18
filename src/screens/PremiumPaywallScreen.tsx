import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Crown, Check, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PurchasesPackage } from "react-native-purchases";
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from "../lib/revenuecatClient";

export default function PremiumPaywallScreen() {
  const navigation = useNavigation();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);

      if (!isRevenueCatEnabled()) {
        Alert.alert(
          "Subscriptions Unavailable",
          "Subscriptions are only available on iOS. Please use the mobile app to subscribe.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
        return;
      }

      const offerings = await getOfferings();

      if (offerings?.current?.availablePackages) {
        setPackages(offerings.current.availablePackages);

        // Pre-select monthly package if available
        const monthlyPkg = offerings.current.availablePackages.find(
          p => p.identifier === "$rc_monthly"
        );
        if (monthlyPkg) {
          setSelectedPackage(monthlyPkg.identifier);
        }
      } else {
        Alert.alert(
          "No Packages Available",
          "No subscription packages are currently available. Please try again later."
        );
      }
    } catch (error) {
      console.error("Error loading offerings:", error);
      Alert.alert("Error", "Failed to load subscription options. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      if (!selectedPackage) {
        Alert.alert("Select Plan", "Please select a subscription plan.");
        return;
      }

      setPurchasing(true);

      const pkg = packages.find(p => p.identifier === selectedPackage);
      if (!pkg) {
        Alert.alert("Error", "Selected package not found.");
        return;
      }

      const customerInfo = await purchasePackage(pkg);

      if (customerInfo) {
        Alert.alert(
          "Success! 🎉",
          "Welcome to Premium! You now have unlimited access to all features.",
          [
            {
              text: "Get Started",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert("Purchase Failed", "Something went wrong. Please try again.");
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setPurchasing(true);
      const customerInfo = await restorePurchases();

      if (customerInfo && Object.keys(customerInfo.entitlements.active).length > 0) {
        Alert.alert(
          "Restored! 🎉",
          "Your purchases have been restored successfully.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("No Purchases", "No previous purchases found to restore.");
      }
    } catch (error) {
      Alert.alert("Restore Failed", "Failed to restore purchases. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (pkg: PurchasesPackage): string => {
    return pkg.product.priceString;
  };

  const getPeriod = (identifier: string): string => {
    if (identifier.includes("monthly")) return "/month";
    if (identifier.includes("annual")) return "/year";
    return "";
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-white mt-4">Loading plans...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="items-center px-6 pt-8 pb-6">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="absolute top-4 right-6 z-10"
          >
            <X size={28} color="#fff" />
          </TouchableOpacity>

          <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-4">
            <Crown size={40} color="#fff" />
          </View>

          <Text className="text-white text-3xl font-bold text-center mb-2">
            Go Premium
          </Text>
          <Text className="text-gray-400 text-center text-base">
            Unlock unlimited access to all premium features
          </Text>
        </View>

        {/* Features */}
        <View className="px-6 mb-6">
          {[
            "60 credits per month",
            "Priority customer support",
            "Advanced analytics & reporting",
            "Access to all trades",
            "No ads or restrictions",
            "Early access to new features",
          ].map((feature, index) => (
            <View key={index} className="flex-row items-center mb-3">
              <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center mr-3">
                <Check size={16} color="#fff" strokeWidth={3} />
              </View>
              <Text className="text-white text-base flex-1">{feature}</Text>
            </View>
          ))}
        </View>

        {/* Packages */}
        <View className="px-6 mb-6">
          <Text className="text-white text-xl font-bold mb-4">Choose Your Plan</Text>

          {packages.map((pkg) => {
            const isSelected = selectedPackage === pkg.identifier;
            const isAnnual = pkg.identifier.includes("annual");

            return (
              <TouchableOpacity
                key={pkg.identifier}
                onPress={() => setSelectedPackage(pkg.identifier)}
                className="mb-3"
              >
                <LinearGradient
                  colors={isSelected ? ["#3b82f6", "#2563eb"] : ["#1f1f1f", "#1f1f1f"]}
                  className="rounded-2xl p-4 border-2"
                  style={{
                    borderColor: isSelected ? "#3b82f6" : "#333",
                  }}
                >
                  <View className="flex-row justify-between items-center">
                    <View className="flex-1 mr-2">
                      <Text className="text-white text-lg font-bold mb-1">
                        {pkg.product.title}
                      </Text>
                      {isAnnual && (
                        <View className="self-start bg-green-500 px-2 py-1 rounded-full mb-1">
                          <Text className="text-white text-xs font-bold">SAVE ~17%</Text>
                        </View>
                      )}
                      <Text className="text-gray-400 text-sm">
                        {pkg.product.description}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-white text-2xl font-bold">
                        {formatPrice(pkg)}
                      </Text>
                      <Text className="text-gray-400 text-xs">
                        {getPeriod(pkg.identifier)}
                      </Text>
                    </View>
                  </View>

                  </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Subscribe Button */}
        <View className="px-6 mb-4">
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={purchasing || !selectedPackage}
            className="overflow-hidden rounded-2xl"
          >
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              className="py-4 items-center justify-center"
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  Start Free Trial
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Restore Button */}
        <View className="px-6 mb-4">
          <TouchableOpacity
            onPress={handleRestore}
            disabled={purchasing}
            className="py-3 items-center"
          >
            <Text className="text-blue-400 text-base font-semibold">
              Restore Purchases
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View className="px-6 pb-4">
          <Text className="text-gray-500 text-xs text-center leading-5 mb-3">
            Payment will be charged to your App Store account at confirmation of purchase.
            Subscriptions automatically renew unless canceled at least 24 hours before the end of
            the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period.
          </Text>
          <Text className="text-gray-500 text-xs text-center leading-5">
            You can manage or cancel your subscription anytime in your device's Settings {'>'} Apple ID {'>'} Subscriptions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
