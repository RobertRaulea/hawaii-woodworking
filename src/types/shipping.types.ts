export interface Address {
  street: string;
  city: string;
  county: string;
  postalCode: string;
  country: string;
}

export interface ShippingFormData {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  shippingAddress: Address;
  billingAddress: Address;
  sameAsShipping: boolean;
  newsletter: boolean;
  acceptPolicy: boolean;
  createAccount: boolean;
}

export interface ShippingContextType {
  shippingData: ShippingFormData | null;
  setShippingData: (data: ShippingFormData) => void;
  clearShippingData: () => void;
}
