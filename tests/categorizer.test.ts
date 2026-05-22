import { describe, it, expect } from 'vitest';
import { categorize } from '../src/utils/categorizer';

describe('categorize()', () => {
  it('categorizes supermarkets as Alimentación', () => {
    expect(categorize('Carrefour')).toBe('Alimentación');
    expect(categorize('COTO Supermercado')).toBe('Alimentación');
    expect(categorize('Rappi - Comida')).toBe('Alimentación');
  });

  it('categorizes streaming as Suscripciones', () => {
    expect(categorize('SPOTIFY')).toBe('Suscripciones');
    expect(categorize('Netflix')).toBe('Suscripciones');
    expect(categorize('Disney Plus')).toBe('Suscripciones');
  });

  it('categorizes fuel stations as Transporte', () => {
    expect(categorize('YPF Santa Fe')).toBe('Transporte');
    expect(categorize('Shell Estacion')).toBe('Transporte');
    expect(categorize('Uber Trip')).toBe('Transporte');
  });

  it('categorizes utilities as Servicios', () => {
    expect(categorize('Edesur SA')).toBe('Servicios');
    expect(categorize('Personal Telefono')).toBe('Servicios');
    expect(categorize('Internet Fibertel')).toBe('Servicios');
  });

  it('falls back to Otros for unknown merchants', () => {
    expect(categorize('Random Store XYZ')).toBe('Otros');
    expect(categorize('')).toBe('Otros');
    expect(categorize('123456')).toBe('Otros');
  });

  it('is case insensitive', () => {
    expect(categorize('CARREFOUR')).toBe('Alimentación');
    expect(categorize('carrefour')).toBe('Alimentación');
    expect(categorize('Carrefour')).toBe('Alimentación');
  });
});
