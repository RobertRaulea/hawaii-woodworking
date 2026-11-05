import type { ComponentProps } from 'react';
import type { SignIn } from '@clerk/clerk-react';

export type SignInAppearance = NonNullable<
  ComponentProps<typeof SignIn>['appearance']
>;
type SignInElements = NonNullable<SignInAppearance['elements']>;

/**
 * Shared Clerk <SignIn> element classes for /login and /admin/login.
 * Light mode keeps the stone/amber palette; dark mode renders a fully black card.
 * Note: Clerk draws the footer band via a solid background-image (not a
 * background-color), so `bg-none` is required to remove it before setting
 * the matching dark background.
 */
export const signInElements: SignInElements = {
  rootBox: 'mx-auto w-full',
  card: 'bg-white dark:bg-black text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-soft overflow-hidden',
  headerTitle: 'font-serif text-stone-900 dark:text-stone-50',
  headerSubtitle: 'text-stone-500 dark:text-stone-400',
  socialButtonsBlockButton:
    'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 dark:bg-white dark:border-stone-600 dark:text-stone-800 dark:hover:bg-stone-100 rounded-lg',
  dividerText: 'text-stone-400 dark:text-stone-400',
  dividerLine: 'bg-stone-200 dark:bg-stone-800',
  formFieldLabel: 'text-stone-700 dark:text-stone-300 font-medium',
  formFieldInput:
    'bg-white border border-stone-300 text-stone-900 placeholder:text-stone-400 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-100 dark:placeholder:text-stone-500 focus:ring-amber-500/40 focus:border-amber-500 rounded-lg',
  formFieldInputShowPasswordButton:
    'text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300',
  formFieldInputShowPasswordIcon:
    'text-stone-400 dark:text-stone-500',
  formFieldHintText: 'text-stone-500 dark:text-stone-400',
  formFieldErrorText: 'text-red-600 dark:text-red-400',
  formFieldWarningText: 'text-amber-600 dark:text-amber-400',
  formFieldSuccessText: 'text-green-600 dark:text-green-400',
  formFieldAction:
    'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
  formButtonPrimary:
    'bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-white rounded-lg font-medium',
  footer: 'bg-none bg-transparent dark:bg-black',
  footerAction: 'bg-transparent dark:bg-black',
  footerPages: 'bg-none bg-transparent dark:bg-black',
  footerActionText: 'text-stone-500 dark:text-stone-400',
  footerActionLink:
    'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
  identityPreviewText: 'text-stone-700 dark:text-stone-300',
  identityPreviewEditButton:
    'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
  otpCodeFieldInput:
    'bg-white border border-stone-300 text-stone-900 dark:bg-stone-900 dark:border-stone-700 dark:text-stone-100 focus:ring-amber-500/40 focus:border-amber-500 rounded-lg',
  otpCodeFieldErrorText: 'text-red-600 dark:text-red-400',
  otpCodeFieldSuccessText: 'text-green-600 dark:text-green-400',
  formResendCodeLink:
    'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
  alternativeMethodsBlockButton:
    'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 dark:bg-white dark:border-stone-600 dark:text-stone-800 dark:hover:bg-stone-100 rounded-lg',
  backLink:
    'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200',
  alertText: 'text-stone-700 dark:text-stone-200',
};

export const signInAppearance: SignInAppearance = {
  elements: signInElements,
};

/**
 * Clerk <UserButton> popover: same stone/amber palette; the footer band uses
 * a background-image like the sign-in footer, so `bg-none` is required.
 */
export const userButtonPopoverElements: SignInElements = {
  userButtonPopoverCard:
    'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-2xl overflow-hidden',
  userButtonPopoverMain: 'text-stone-700 dark:text-stone-200',
  userButtonPopoverActionButton:
    'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800',
  userButtonPopoverActionButtonIconBox: 'text-stone-500 dark:text-stone-400',
  userButtonPopoverActionButtonIcon: 'text-stone-500 dark:text-stone-400',
  userButtonPopoverFooter: 'bg-none bg-transparent dark:bg-stone-900',
  userButtonPopoverFooterPagesLink:
    'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
};

/**
 * Clerk "Manage account" (UserProfile) modal, rendered globally from
 * <ClerkProvider>. Matches the app's stone surfaces and amber accent.
 */
export const userProfileElements: SignInElements = {
  modalBackdrop: 'bg-stone-900/60 dark:bg-black/70 backdrop-blur-sm',
  modalContent:
    'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-2xl overflow-hidden',
  navbar: 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800',
  navbarButton:
    'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800',
  navbarButtonIcon: 'text-stone-500 dark:text-stone-400',
  navbarButtonText: 'text-inherit',
  pageScrollBox: 'bg-white dark:bg-stone-900',
  profileSectionTitleText: 'text-stone-900 dark:text-stone-50',
  profileSectionSubtitleText: 'text-stone-500 dark:text-stone-400',
  profileSectionContent: 'text-stone-700 dark:text-stone-200',
  footer: 'bg-none bg-transparent dark:bg-stone-900',
  footerAction: 'bg-transparent dark:bg-stone-900',
  footerActionText: 'text-stone-500 dark:text-stone-400',
  footerActionLink:
    'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300',
};

/**
 * Global Clerk appearance applied on <ClerkProvider>: amber accent for
 * interactive states plus dark-mode surfaces for portaled UI (UserButton
 * popover in header and admin, UserProfile modal). Component-level
 * appearance props still win per element.
 */
export const clerkAppearance: SignInAppearance = {
  variables: { colorPrimary: '#d97706' },
  elements: {
    ...userButtonPopoverElements,
    ...userProfileElements,
  },
};
