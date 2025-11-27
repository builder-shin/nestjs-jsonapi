import {
  toKebabCase,
  toCamelCase,
  pluralize,
  singularize,
} from '../../../src/utils/naming.util';

describe('NamingUtil', () => {
  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('createdAt')).toBe('created-at');
      expect(toKebabCase('isPublished')).toBe('is-published');
      expect(toKebabCase('HTMLParser')).toBe('html-parser');
    });

    it('should handle already kebab-case strings', () => {
      expect(toKebabCase('created-at')).toBe('created-at');
    });

    it('should handle single word strings', () => {
      expect(toKebabCase('title')).toBe('title');
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('created-at')).toBe('createdAt');
      expect(toCamelCase('is-published')).toBe('isPublished');
    });

    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('created_at')).toBe('createdAt');
      expect(toCamelCase('is_published')).toBe('isPublished');
    });

    it('should handle already camelCase strings', () => {
      expect(toCamelCase('createdAt')).toBe('createdAt');
    });
  });

  describe('pluralize', () => {
    it('should pluralize regular nouns', () => {
      expect(pluralize('article')).toBe('articles');
      expect(pluralize('user')).toBe('users');
    });

    it('should pluralize nouns ending in y', () => {
      expect(pluralize('category')).toBe('categories');
      expect(pluralize('company')).toBe('companies');
    });

    it('should handle nouns ending in vowel + y', () => {
      expect(pluralize('day')).toBe('days');
      expect(pluralize('key')).toBe('keys');
    });

    it('should pluralize nouns ending in s, x, ch, sh', () => {
      expect(pluralize('bus')).toBe('buses');
      expect(pluralize('box')).toBe('boxes');
      expect(pluralize('match')).toBe('matches');
      expect(pluralize('wish')).toBe('wishes');
    });

    it('should pluralize nouns ending in f/fe', () => {
      expect(pluralize('leaf')).toBe('leaves');
      expect(pluralize('knife')).toBe('knives');
    });
  });

  describe('singularize', () => {
    it('should singularize regular plurals', () => {
      expect(singularize('articles')).toBe('article');
      expect(singularize('users')).toBe('user');
    });

    it('should singularize -ies plurals', () => {
      expect(singularize('categories')).toBe('category');
      expect(singularize('companies')).toBe('company');
    });

    it('should singularize -ves plurals', () => {
      expect(singularize('leaves')).toBe('leaf');
    });

    it('should singularize -es plurals', () => {
      expect(singularize('buses')).toBe('bus');
      expect(singularize('boxes')).toBe('box');
    });
  });
});
