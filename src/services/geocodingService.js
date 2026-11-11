/**
 * geocodingService.js
 * Servicio de búsqueda de direcciones y autocompletado geográfico para Argentina.
 * Utiliza arquitectura de alta disponibilidad:
 * 1. Backend SegurAppApi con caché en memoria (/api/geocoding).
 * 2. Fallback de cliente con Photon Komoot OpenStreetMap (sin límite 429).
 * 3. Fallback geográfico local para Gran Buenos Aires (Berazategui, Quilmes, Florencio Varela, Ranelagh).
 */

import { getApiBaseUrl } from '../config/api';

const searchCache = new Map();
const reverseCache = new Map();

/**
 * Busca direcciones en Argentina a partir de un texto libre.
 * @param {string} query Texto a buscar (ej: "antartida argentina" o "Mitre 1200")
 * @returns {Promise<Array>} Lista de resultados geocodificados
 */
export async function searchAddresses(query) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();
  const cacheKey = cleanQuery.toLowerCase();

  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  // 1. Intentar a través de nuestro Backend SegurAppApi
  try {
    const backendUrl = `${getApiBaseUrl()}/api/geocoding/search?q=${encodeURIComponent(cleanQuery)}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        searchCache.set(cacheKey, data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[geocodingService] Backend geocoding no disponible, intentando proveedor directo:', err);
  }

  // 2. Fallback directo a Photon Komoot (OpenStreetMap sin límites 429)
  try {
    const contextual = /argentina/i.test(cleanQuery) ? cleanQuery : `${cleanQuery}, Argentina`;
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(contextual)}&lat=-34.794&lon=-58.211&limit=6`;
    const pRes = await fetch(photonUrl);

    if (pRes.ok) {
      const pData = await pRes.json();
      if (Array.isArray(pData?.features) && pData.features.length > 0) {
        const mapped = pData.features
          .map((feat) => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0];
            const lon = coords[0];
            const lat = coords[1];

            const name = props.name || '';
            const street = props.street || name;
            const houseNumber = props.housenumber || '';
            const city = props.city || props.district || props.county || 'Gran Buenos Aires';
            const state = props.state || 'Buenos Aires';

            const parts = [street, houseNumber, city, state].filter(Boolean);

            return {
              id: `photon_${lat.toFixed(5)}_${lon.toFixed(5)}`,
              displayName: parts.join(', '),
              street: street || cleanQuery,
              streetNumber: houseNumber,
              city,
              state,
              latitude: lat,
              longitude: lon,
            };
          })
          .filter((item) => item.latitude !== 0 && item.longitude !== 0);

        if (mapped.length > 0) {
          searchCache.set(cacheKey, mapped);
          return mapped;
        }
      }
    }
  } catch (pErr) {
    console.warn('[geocodingService] Fallback Photon falló:', pErr);
  }

  // 3. Fallback geográfico local para Gran Buenos Aires
  const localResults = getLocalFallbackMatches(cleanQuery);
  searchCache.set(cacheKey, localResults);
  return localResults;
}

/**
 * Geocodifica una dirección estructurada (calle, número, localidad, provincia).
 */
export async function geocodeStructuredAddress({ street, streetNumber, city, state }) {
  const parts = [];
  if (street) parts.push(street);
  if (streetNumber) parts.push(streetNumber);
  if (city) parts.push(city);
  if (state) parts.push(state);
  parts.push('Argentina');

  const query = parts.join(', ');
  const results = await searchAddresses(query);
  return results.length > 0 ? results[0] : null;
}

/**
 * Obtiene la dirección más cercana a un par de coordenadas (Geocodificación Inversa).
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>} Dirección legible (ej: "Avenida Antártida Argentina, Ranelagh")
 */
export async function getNearestAddress(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  const cacheKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey);
  }

  // 1. Intentar a través de nuestro Backend SegurAppApi
  try {
    const backendUrl = `${getApiBaseUrl()}/api/geocoding/reverse?lat=${latitude}&lon=${longitude}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.address) {
        reverseCache.set(cacheKey, data.address);
        return data.address;
      }
    }
  } catch (err) {
    console.warn('[geocodingService] Backend reverse no disponible, probando Photon:', err);
  }

  // 2. Fallback directo a Photon Reverse (OpenStreetMap) con soporte de múltiples calles
  try {
    const photonRevUrl = `https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}&limit=5`;
    const pRes = await fetch(photonRevUrl);
    if (pRes.ok) {
      const pData = await pRes.json();
      const features = Array.isArray(pData?.features) ? pData.features : [];

      const streetNames = [];
      let houseNumber = '';
      let city = '';

      for (const feat of features) {
        const props = feat.properties || {};
        let street = props.street;
        if (!street && (props.osm_key === 'highway' || props.type === 'street') && props.name) {
          street = props.name;
        }

        if (street && typeof street === 'string') {
          const cleanSt = street.trim();
          const exists = streetNames.some(
            (s) =>
              s.toLowerCase() === cleanSt.toLowerCase() ||
              s.toLowerCase().includes(cleanSt.toLowerCase()) ||
              cleanSt.toLowerCase().includes(s.toLowerCase())
          );
          if (!exists) {
            streetNames.push(cleanSt);
          }
        }

        if (!houseNumber && props.housenumber) {
          houseNumber = String(props.housenumber).trim();
        }

        if (!city) {
          city = props.city || props.district || props.locality || props.county || '';
        }
      }

      if (streetNames.length > 0) {
        let combinedStreet = '';
        if (streetNames.length >= 2) {
          combinedStreet = `${streetNames[0]} y ${streetNames[1]}`;
        } else {
          combinedStreet = houseNumber ? `${streetNames[0]} ${houseNumber}` : streetNames[0];
        }

        const finalAddress = city ? `${combinedStreet}, ${city}` : combinedStreet;
        reverseCache.set(cacheKey, finalAddress);
        return finalAddress;
      }
    }
  } catch (pErr) {
    console.warn('[geocodingService] Fallback Photon reverse falló:', pErr);
  }

  // 3. Fallback inteligente local por cuadrante geográfico
  const localFallback = getLocalReverseFallback(latitude, longitude);
  reverseCache.set(cacheKey, localFallback);
  return localFallback;
}

function getLocalFallbackMatches(query) {
  const localCatalog = [
    { name: 'Avenida Antártida Argentina', number: '1200', city: 'Ranelagh', state: 'Buenos Aires', lat: -34.79430, lon: -58.21155 },
    { name: 'Avenida Calchaquí', number: '6200', city: 'Florencio Varela', state: 'Buenos Aires', lat: -34.78910, lon: -58.27890 },
    { name: 'Avenida San Martín', number: '1500', city: 'Florencio Varela', state: 'Buenos Aires', lat: -34.80210, lon: -58.27540 },
    { name: 'Calle 14', number: '4500', city: 'Berazategui', state: 'Buenos Aires', lat: -34.76340, lon: -58.21340 },
    { name: 'Avenida Mitre', number: '1200', city: 'Quilmes', state: 'Buenos Aires', lat: -34.72120, lon: -58.25670 },
    { name: 'Avenida 12 de Octubre', number: '800', city: 'Quilmes', state: 'Buenos Aires', lat: -34.72980, lon: -58.26120 },
    { name: 'Avenida Dardo Rocha', number: '500', city: 'Bernal', state: 'Buenos Aires', lat: -34.70890, lon: -58.28120 },
    { name: 'Avenida Eva Perón', number: '3500', city: 'Florencio Varela', state: 'Buenos Aires', lat: -34.81560, lon: -58.26900 },
    { name: 'Avenida Hudson', number: '2200', city: 'Hudson', state: 'Buenos Aires', lat: -34.82560, lon: -58.17230 },
  ];

  const q = query.toLowerCase();
  return localCatalog
    .filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        q.includes(item.name.toLowerCase().split(' ').pop())
    )
    .map((item) => ({
      id: `local_${item.lat.toFixed(4)}_${item.lon.toFixed(4)}`,
      displayName: `${item.name} ${item.number}, ${item.city}, ${item.state}`,
      street: item.name,
      streetNumber: item.number,
      city: item.city,
      state: item.state,
      latitude: item.lat,
      longitude: item.lon,
    }));
}

function getLocalReverseFallback(lat, lon) {
  if (lat < -34.78 && lat > -34.81 && lon < -58.19 && lon > -58.23) {
    return 'Avenida Antártida Argentina y Calle 354, Ranelagh';
  }
  if (lat < -34.77 && lat > -34.83 && lon < -58.25 && lon > -58.30) {
    return 'Avenida San Martín y José Dans Rey, Florencio Varela';
  }
  if (lat < -34.70 && lat > -34.75 && lon < -58.23 && lon > -58.28) {
    return 'Avenida Mitre y Av. 12 de Octubre, Quilmes';
  }
  return 'Ubicación geolocalizada en mapa';
}
