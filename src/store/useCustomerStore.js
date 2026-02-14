import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customers: [],
      loading: false,

      setCustomers: (customers) => set({ customers }),

      addCustomer: (customer) =>
        set((state) => ({
          customers: [...state.customers, customer],
        })),

      updateCustomer: (updatedCustomer) =>
        set((state) => ({
          customers: state.customers.map((cust) =>
            cust.id === updatedCustomer.id ? updatedCustomer : cust
          ),
        })),

      clearCustomers: () => set({ customers: [] }),
    }),
    {
      name: 'customer-storage', 
    }
  )
);
