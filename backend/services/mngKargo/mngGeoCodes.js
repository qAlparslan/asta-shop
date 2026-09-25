const { getMngKargoConfig } = require('./mngKargoConfig');
const { mngApiRequest } = require('./mngKargoHttp');

/** @type {{ at: number; cities: { code: string; name: string }[] } | null} */
let cityCache = null;
/** @type {Map<string, { at: number; districts: { code: string; name: string }[] }>} */
const districtCache = new Map();

const CACHE_MS = 24 * 60 * 60 * 1000;

function normalizeTr(s) {
    return String(s || '')
        .trim()
        .toLocaleLowerCase('tr-TR')
        .replace(/ı/g, 'i')
        .replace(/İ/g, 'i')
        .replace(/\s+/g, ' ');
}

async function getCities() {
    const now = Date.now();
    if (cityCache && now - cityCache.at < CACHE_MS) return cityCache.cities;
    const cfg = getMngKargoConfig();
    const list = await mngApiRequest({
        method: 'GET',
        path: '/mngapi/api/cbsinfoapi/getcities',
    });
    const cities = Array.isArray(list) ? list : [];
    cityCache = { at: now, cities };
    return cities;
}

async function getDistricts(cityCode) {
    const key = String(cityCode);
    const now = Date.now();
    const hit = districtCache.get(key);
    if (hit && now - hit.at < CACHE_MS) return hit.districts;
    const list = await mngApiRequest({
        method: 'GET',
        path: `/mngapi/api/cbsinfoapi/getdistricts/${encodeURIComponent(key)}`,
    });
    const districts = Array.isArray(list) ? list : [];
    districtCache.set(key, { at: now, districts });
    return districts;
}

/**
 * @param {string | null | undefined} provinceName
 * @param {string | null | undefined} districtName
 */
async function resolveCityDistrictCodes(provinceName, districtName) {
    const cities = await getCities();
    const provNorm = normalizeTr(provinceName);
    let city = cities.find((c) => normalizeTr(c.name) === provNorm);
    if (!city && provNorm) {
        city = cities.find((c) => normalizeTr(c.name).includes(provNorm) || provNorm.includes(normalizeTr(c.name)));
    }
    if (!city) {
        throw new Error(
            `MNG: İl eşleşmedi (${provinceName || '—'}). Checkout il alanını kontrol edin veya CBS Info ile doğrulayın.`,
        );
    }
    const districts = await getDistricts(city.code);
    const distNorm = normalizeTr(districtName);
    let district = districts.find((d) => normalizeTr(d.name) === distNorm);
    if (!district && distNorm) {
        district = districts.find(
            (d) => normalizeTr(d.name).includes(distNorm) || distNorm.includes(normalizeTr(d.name)),
        );
    }
    if (!district) {
        throw new Error(
            `MNG: İlçe eşleşmedi (${districtName || '—'}, il: ${city.name}). Adres ilçesini düzeltin.`,
        );
    }
    return {
        cityCode: Number(city.code),
        districtCode: Number(district.code),
        cityName: city.name,
        districtName: district.name,
    };
}

module.exports = { resolveCityDistrictCodes, normalizeTr };
