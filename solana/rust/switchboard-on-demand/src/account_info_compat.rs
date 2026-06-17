//! Compatibility layer for different AccountInfo types
//!
//! This module provides compatibility between different AccountInfo implementations,
//! using pinocchio AccountView internally when the pinocchio feature is enabled,
//! otherwise falling back to anchor/solana-program AccountInfo types.

// Use pinocchio AccountView when the feature is enabled for better performance.
#[cfg(feature = "pinocchio")]
pub type AccountView = pinocchio::AccountView;

// Backwards-compatible alias for existing callers that import AccountInfo from this crate.
#[cfg(feature = "pinocchio")]
pub type AccountInfo = AccountView;

// Otherwise use the appropriate AccountInfo type based on anchor feature
#[cfg(all(not(feature = "pinocchio"), feature = "anchor"))]
pub type AccountInfo<'a> = anchor_lang::prelude::AccountInfo<'a>;

#[cfg(all(not(feature = "pinocchio"), not(feature = "anchor")))]
pub type AccountInfo<'a> = crate::solana_program::account_info::AccountInfo<'a>;

/// Trait for types that can be converted to a reference to AccountInfo
#[cfg(feature = "pinocchio")]
pub trait AsAccountInfo<'a> {
    fn as_account_info(&self) -> &AccountInfo;
}

#[cfg(feature = "pinocchio")]
pub trait AsAccountInfoMut<'a>: AsAccountInfo<'a> {
    fn as_account_info_mut(&mut self) -> &mut AccountInfo;
}

#[cfg(not(feature = "pinocchio"))]
pub trait AsAccountInfo<'a> {
    fn as_account_info(&self) -> &AccountInfo<'a>;
}

/// Implementation for the primary AccountInfo type
#[cfg(feature = "pinocchio")]
impl<'a> AsAccountInfo<'a> for AccountInfo {
    #[inline(always)]
    fn as_account_info(&self) -> &AccountInfo {
        self
    }
}

#[cfg(feature = "pinocchio")]
impl<'a> AsAccountInfoMut<'a> for AccountInfo {
    #[inline(always)]
    fn as_account_info_mut(&mut self) -> &mut AccountInfo {
        self
    }
}

#[cfg(not(feature = "pinocchio"))]
impl<'a> AsAccountInfo<'a> for AccountInfo<'a> {
    #[inline(always)]
    fn as_account_info(&self) -> &AccountInfo<'a> {
        self
    }
}

/// Implementation for references to AccountInfo
#[cfg(feature = "pinocchio")]
impl<'a> AsAccountInfo<'a> for &AccountInfo {
    #[inline(always)]
    fn as_account_info(&self) -> &AccountInfo {
        self
    }
}

#[cfg(feature = "pinocchio")]
impl<'a> AsAccountInfo<'a> for &mut AccountInfo {
    #[inline(always)]
    fn as_account_info(&self) -> &AccountInfo {
        self
    }
}

#[cfg(feature = "pinocchio")]
impl<'a> AsAccountInfoMut<'a> for &mut AccountInfo {
    #[inline(always)]
    fn as_account_info_mut(&mut self) -> &mut AccountInfo {
        self
    }
}

#[cfg(not(feature = "pinocchio"))]
impl<'a> AsAccountInfo<'a> for &AccountInfo<'a> {
    #[inline(always)]
    fn as_account_info(&self) -> &AccountInfo<'a> {
        self
    }
}

/// Helper macro to abstract field access differences between AccountInfo types
#[cfg(feature = "pinocchio")]
#[macro_export]
macro_rules! get_account_key {
    ($account:expr) => {
        $account.address()
    };
}

#[cfg(not(feature = "pinocchio"))]
#[macro_export]
macro_rules! get_account_key {
    ($account:expr) => {
        $account.key
    };
}

#[cfg(feature = "pinocchio")]
#[macro_export]
macro_rules! borrow_account_data {
    ($account:expr) => {
        unsafe { $account.borrow_unchecked() }
    };
}

#[cfg(not(feature = "pinocchio"))]
#[macro_export]
macro_rules! borrow_account_data {
    ($account:expr) => {
        $account.data.borrow()
    };
}

#[cfg(feature = "pinocchio")]
#[macro_export]
macro_rules! borrow_mut_account_data {
    ($account:expr) => {
        unsafe { $account.borrow_unchecked_mut() }
    };
}

#[cfg(not(feature = "pinocchio"))]
#[macro_export]
macro_rules! borrow_mut_account_data {
    ($account:expr) => {
        $account.data.borrow_mut()
    };
}
