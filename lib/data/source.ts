/**
 * Data abstraction layer — jedyne miejsce, z którego UI czyta dane.
 *
 * Przełącznik źródła: NEXT_PUBLIC_DATA_SOURCE = 'supabase' (domyślnie) | 'mock'.
 * Obie implementacje mają identyczne sygnatury (async), więc UI nie wie skąd
 * pochodzą dane. Powrót do mocków = zmiana jednej zmiennej w .env.local.
 *
 *   UI → source.ts → source.supabase.ts  (domyślnie)
 *                  → source.mock.ts       (NEXT_PUBLIC_DATA_SOURCE=mock)
 */

import * as mock from './source.mock'
import * as supabase from './source.supabase'

const useMock = process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock'
const impl = useMock ? mock : supabase

export const getFeedPage = impl.getFeedPage
export const getBrandActiveAdCount = impl.getBrandActiveAdCount
export const getBrandById = impl.getBrandById
export const getAdsByBrand = impl.getAdsByBrand
export const getProductById = impl.getProductById
export const getAllBrands = impl.getAllBrands
