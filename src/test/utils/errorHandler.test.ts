import { describe, it, expect, vi } from 'vitest';
import {
  handleSupabaseError,
  logError,
  safeAsync,
  formatErrorForUser,
  CustomError,
} from '../../utils/errorHandler';

describe('errorHandler', () => {
  describe('handleSupabaseError', () => {
    it('should handle PGRST116 error code', () => {
      const error = { code: 'PGRST116', message: 'Not found' };
      const result = handleSupabaseError(error);
      expect(result).toBe('Kayıt bulunamadı');
    });

    it('should handle 23505 error code (duplicate)', () => {
      const error = { code: '23505', message: 'Duplicate key' };
      const result = handleSupabaseError(error);
      expect(result).toBe('Bu kayıt zaten mevcut');
    });

    it('should handle 23503 error code (foreign key)', () => {
      const error = { code: '23503', message: 'Foreign key violation' };
      const result = handleSupabaseError(error);
      expect(result).toBe('İlişkili bir kayıt bulunamadı');
    });

    it('should handle 42501 error code (permission)', () => {
      const error = { code: '42501', message: 'Permission denied' };
      const result = handleSupabaseError(error);
      expect(result).toBe('Bu işlem için yetkiniz yok');
    });

    it('should return error message if available', () => {
      const error = { message: 'Custom error message' };
      const result = handleSupabaseError(error);
      expect(result).toBe('Custom error message');
    });

    it('should handle string errors', () => {
      const result = handleSupabaseError('String error');
      expect(result).toBe('String error');
    });

    it('should handle null/undefined errors', () => {
      const result = handleSupabaseError(null);
      expect(result).toBe('Bilinmeyen bir hata oluştu');
    });
  });

  describe('CustomError', () => {
    it('should create custom error with message', () => {
      const error = new CustomError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('CustomError');
    });

    it('should create custom error with code', () => {
      const error = new CustomError('Test error', 'TEST_CODE');
      expect(error.code).toBe('TEST_CODE');
    });

    it('should create custom error with details', () => {
      const details = { field: 'email' };
      const error = new CustomError('Test error', 'TEST_CODE', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('formatErrorForUser', () => {
    it('should format CustomError', () => {
      const error = new CustomError('User-friendly message');
      const result = formatErrorForUser(error);
      expect(result).toBe('User-friendly message');
    });

    it('should format standard Error', () => {
      const error = new Error('Standard error');
      const result = formatErrorForUser(error);
      expect(result).toBe('Standard error');
    });

    it('should format string errors', () => {
      const result = formatErrorForUser('String error');
      expect(result).toBe('String error');
    });

    it('should handle unknown error types', () => {
      const result = formatErrorForUser({ unknown: 'object' });
      expect(result).toBe('Beklenmeyen bir hata oluştu');
    });
  });

  describe('safeAsync', () => {
    it('should return data on success', async () => {
      const asyncFn = async () => 'success';
      const result = await safeAsync(asyncFn);
      expect(result.data).toBe('success');
      expect(result.error).toBeNull();
    });

    it('should return error on failure', async () => {
      const asyncFn = async () => {
        throw new Error('Test error');
      };
      const result = await safeAsync(asyncFn);
      expect(result.data).toBeNull();
      expect(result.error).toBe('Test error');
    });

    it('should use custom error message', async () => {
      const asyncFn = async () => {
        throw new Error('Original error');
      };
      const result = await safeAsync(asyncFn, 'Custom error message');
      expect(result.error).toBe('Custom error message');
    });
  });

  describe('logError', () => {
    it('should log error without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      
      logError(error, 'TestContext');
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

