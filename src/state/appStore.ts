import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Estimate,
  JobListing,
  Professional,
  Customer,
  EstimateRequest,
  PortfolioItem,
  Review,
} from '../types/glossy';
import {
  calculateEstimate,
} from '../utils/estimate-calculator';
import { WOODWORK_PRICING } from '../utils/pricing-data';
import { LEAD_COST_STANDARD, LEAD_COST_PREMIUM } from '../config/trades-pricing';
import { SupportedLocale, detectUserLocale } from '../config/i18n';

interface AppState {
  // Internationalization
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Current user mode
  userMode: 'customer' | 'professional' | null;
  setUserMode: (mode: 'customer' | 'professional' | null) => void;

  // Current customer
  currentCustomer: Customer | null;
  setCurrentCustomer: (customer: Customer | null) => void;

  // Current professional
  currentProfessional: Professional | null;
  setCurrentProfessional: (professional: Professional | null) => void;

  // Estimates
  currentEstimate: Estimate | null;
  setCurrentEstimate: (estimate: Estimate | null) => void;
  createEstimate: (request: EstimateRequest) => Estimate;
  markEstimateAsPaid: (estimateId: string) => void;

  // Job listings
  jobListings: JobListing[];
  addJobListing: (job: JobListing) => void;
  purchaseLead: (jobId: string, professionalId: string) => boolean;

  // Professionals
  professionals: Professional[];
  addProfessional: (professional: Professional) => void;
  updateProfessionalCredits: (professionalId: string, credits: number) => void;
  addProfessionalPortfolioItem: (professionalId: string, item: PortfolioItem) => void;
  removeProfessionalPortfolioItem: (professionalId: string, itemId: string) => void;
  
  // Customer portfolio
  addCustomerPortfolioItem: (customerId: string, item: PortfolioItem) => void;
  removeCustomerPortfolioItem: (customerId: string, itemId: string) => void;
  
  // Reviews
  addReview: (professionalId: string, review: Review) => void;
  addProfessionalReply: (professionalId: string, reviewId: string, reply: string) => void;
  
  // Reset
  reset: () => void;
}

interface PersistedState {
  isDarkMode: boolean;
  locale: SupportedLocale;
  jobListings: JobListing[];
  professionals: Professional[];
  // NOTE: currentEstimate is NOT persisted to prevent wrong estimate being shown after payment
  // Each estimate session should be fresh - no old data from previous sessions
}

const initialState = {
  isDarkMode: false,
  locale: detectUserLocale() as SupportedLocale,
  userMode: null,
  currentCustomer: null,
  currentProfessional: null,
  currentEstimate: null, // Not persisted - fresh each session
  jobListings: [],
  professionals: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setLocale: (locale) => set({ locale }),

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      setUserMode: (mode) => set({ userMode: mode }),

      setCurrentCustomer: (customer) => set({ currentCustomer: customer }),

      setCurrentProfessional: (professional) => set({ currentProfessional: professional }),

      setCurrentEstimate: (estimate) => set({ currentEstimate: estimate }),

      createEstimate: (request: EstimateRequest) => {
        // Clear any existing estimate first to prevent showing wrong data
        set({ currentEstimate: null });
        
        const calculation = calculateEstimate(request);

        const estimate: Estimate = {
          id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9), // More unique ID
          request,
          totalMinPrice: calculation.minPrice,
          totalMaxPrice: calculation.maxPrice,
          woodworkPricing: WOODWORK_PRICING,
          postcodeMultiplier: calculation.postcodeMultiplier,
          paid: false,
          createdAt: new Date().toISOString(),
        };

        if (__DEV__) {
          console.log('📝 Created new estimate:', {
            id: estimate.id,
            rooms: estimate.request.rooms.length,
            propertyType: estimate.request.propertyType,
            packageId: estimate.request.packageId,
            totalMinPrice: estimate.totalMinPrice,
            totalMaxPrice: estimate.totalMaxPrice,
          });
        }

        set({ currentEstimate: estimate });
        return estimate;
      },

      markEstimateAsPaid: (estimateId: string) => {
        const { currentEstimate } = get();
        
        if (__DEV__) {
          console.log('💰 Marking estimate as paid:', {
            requestedId: estimateId,
            currentId: currentEstimate?.id,
            match: currentEstimate?.id === estimateId,
          });
        }
        
        if (currentEstimate && currentEstimate.id === estimateId) {
          set({
            currentEstimate: {
              ...currentEstimate,
              paid: true,
            },
          });
          
          if (__DEV__) {
            console.log('✅ Estimate marked as paid successfully');
          }
        } else {
          if (__DEV__) {
            console.warn('⚠️ Estimate ID mismatch - could not mark as paid');
          }
        }
      },

      addJobListing: (job) => {
        set((state) => ({
          jobListings: [job, ...state.jobListings],
        }));
      },

      purchaseLead: (jobId: string, professionalId: string) => {
        const { jobListings, currentProfessional } = get();
        const job = jobListings.find((j) => j.id === jobId);

        if (!job || !currentProfessional) return false;

        // Check if already purchased
        if (job.interestedProfessionals.includes(professionalId)) {
          return false;
        }

        // Check if max professionals reached
        if (job.interestedProfessionals.length >= job.maxProfessionals) {
          return false;
        }

        // Determine lead cost based on premium status
        const leadCost = currentProfessional.isPremium ? LEAD_COST_PREMIUM : LEAD_COST_STANDARD;

        // Check if professional has enough credits
        if (currentProfessional.credits < leadCost) {
          return false;
        }

        // Update job listing
        set((state) => ({
          jobListings: state.jobListings.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  interestedProfessionals: [...j.interestedProfessionals, professionalId],
                }
              : j
          ),
        }));

        // Deduct credits based on membership tier
        get().updateProfessionalCredits(professionalId, currentProfessional.credits - leadCost);

        return true;
      },

      addProfessional: (professional) => {
        set((state) => ({
          professionals: [...state.professionals, professional],
        }));
      },

      updateProfessionalCredits: (professionalId: string, credits: number) => {
        set((state) => ({
          professionals: state.professionals.map((p) =>
            p.id === professionalId ? { ...p, credits } : p
          ),
          currentProfessional:
            state.currentProfessional?.id === professionalId
              ? { ...state.currentProfessional, credits }
              : state.currentProfessional,
        }));
      },

      addProfessionalPortfolioItem: (professionalId: string, item: PortfolioItem) => {
        set((state) => ({
          professionals: state.professionals.map((p) =>
            p.id === professionalId
              ? { ...p, portfolio: [...p.portfolio, item] }
              : p
          ),
          currentProfessional:
            state.currentProfessional?.id === professionalId
              ? { ...state.currentProfessional, portfolio: [...state.currentProfessional.portfolio, item] }
              : state.currentProfessional,
        }));
      },

      removeProfessionalPortfolioItem: (professionalId: string, itemId: string) => {
        set((state) => ({
          professionals: state.professionals.map((p) =>
            p.id === professionalId
              ? { ...p, portfolio: p.portfolio.filter((i) => i.id !== itemId) }
              : p
          ),
          currentProfessional:
            state.currentProfessional?.id === professionalId
              ? { ...state.currentProfessional, portfolio: state.currentProfessional.portfolio.filter((i) => i.id !== itemId) }
              : state.currentProfessional,
        }));
      },

      addCustomerPortfolioItem: (customerId: string, item: PortfolioItem) => {
        set((state) => ({
          currentCustomer:
            state.currentCustomer?.id === customerId
              ? { ...state.currentCustomer, portfolio: [...state.currentCustomer.portfolio, item] }
              : state.currentCustomer,
        }));
      },

      removeCustomerPortfolioItem: (customerId: string, itemId: string) => {
        set((state) => ({
          currentCustomer:
            state.currentCustomer?.id === customerId
              ? { ...state.currentCustomer, portfolio: state.currentCustomer.portfolio.filter((i) => i.id !== itemId) }
              : state.currentCustomer,
        }));
      },

      addReview: (professionalId: string, review: Review) => {
        set((state) => {
          const professional = state.professionals.find((p) => p.id === professionalId);
          if (!professional) return state;

          const newReviews = [...professional.reviews, review];
          const totalRating = newReviews.reduce((sum, r) => sum + r.rating, 0);
          const avgRating = totalRating / newReviews.length;

          return {
            professionals: state.professionals.map((p) =>
              p.id === professionalId
                ? {
                    ...p,
                    reviews: newReviews,
                    rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
                    totalReviews: newReviews.length,
                  }
                : p
            ),
            currentProfessional:
              state.currentProfessional?.id === professionalId
                ? {
                    ...state.currentProfessional,
                    reviews: newReviews,
                    rating: Math.round(avgRating * 10) / 10,
                    totalReviews: newReviews.length,
                  }
                : state.currentProfessional,
          };
        });
      },

      addProfessionalReply: (professionalId: string, reviewId: string, reply: string) => {
        set((state) => ({
          professionals: state.professionals.map((p) =>
            p.id === professionalId
              ? {
                  ...p,
                  reviews: p.reviews.map((r) =>
                    r.id === reviewId ? { ...r, professionalResponse: reply } : r
                  ),
                }
              : p
          ),
          currentProfessional:
            state.currentProfessional?.id === professionalId
              ? {
                  ...state.currentProfessional,
                  reviews: state.currentProfessional.reviews.map((r) =>
                    r.id === reviewId ? { ...r, professionalResponse: reply } : r
                  ),
                }
              : state.currentProfessional,
        }));
      },

      reset: () => set(initialState),
    }),
    {
      name: 'glossy-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): PersistedState => ({
        isDarkMode: state.isDarkMode,
        locale: state.locale,
        jobListings: state.jobListings,
        professionals: state.professionals,
        // currentEstimate is NOT persisted - prevents showing wrong estimate after payment
      }),
    }
  )
);
