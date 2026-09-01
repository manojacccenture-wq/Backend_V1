import https from "https";
import http from "http";
import { getIntegrationTaskModel } from "./integrationTask.model.js";

const safeFetch = (url, options) => {
    return new Promise((resolve, reject) => {
        const isDev = process.env.NODE_ENV !== "production";
        const parsedUrl = new URL(url);
        const transport = parsedUrl.protocol === "https:" ? https : http;
        const reqOptions = {
            method: options.method,
            headers: options.headers,
            rejectUnauthorized: isDev ? false : true,
        };
        
        const req = transport.request(url, reqOptions, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                let parsed = {};
                try { parsed = JSON.parse(data); } catch(e) {}
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    statusText: res.statusMessage,
                    json: async () => parsed
                });
            });
        });
        
        req.on("error", (e) => reject(e));
        if (options.body) req.write(options.body);
        req.end();
    });
};


const recordFailure = async (type, payload, errorMsg) => {
    try {
        const IntegrationTask = getIntegrationTaskModel();
        await IntegrationTask.create({ type, payload, lastError: errorMsg });
    } catch(e) {
        console.error("Failed to record integration task", e.message);
    }
};

/**
 * FoodERP User Provisioning Service (Orchestrator)
 * 
 * Calls FoodERP internal APIs to provision tenants, users, and roles safely.
 * Built for idempotent Option B identity architecture.
 */


const getHttpsAgent = () => {
    if (process.env.NODE_ENV !== "production") {
        return new https.Agent({ rejectUnauthorized: false });
    }
    return undefined;
};
const getHeaders = () => ({
    "Content-Type": "application/json",
    "x-internal-api-key": process.env.INTERNAL_API_KEY || "",
});

const MSAAS_TO_FOODERP_ROLE_MAP = {
    "Tenant Admin": "Franchisee",
    "Manager": "Restaurateur",
    "Staff": "Waiter"
};

const getFoodERPRole = (msaasRole) => {
    return MSAAS_TO_FOODERP_ROLE_MAP[msaasRole] || "Waiter";
};

export const provisionFoodERPTenant = async (tenantId, storeName, email, isRetry = false) => {
    const url = process.env.FOODERP_BACKEND_URL;
    if (!url) return;

    try {
        const response = await safeFetch(`${url}/api/sso/provision-franchise`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ tenantId, storeName, email }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMsg = `[FoodERP] Franchise Provision failed: ${data.error || response.statusText}`;
            console.warn(errorMsg);
            throw new Error(errorMsg);
        }
        return true;
    } catch (error) {
        console.warn(`[FoodERP] Network error: ${error.message}`);
        throw error;
    }
};

export const provisionFoodERPUser = async (tenantId, userId, email, name, msaasRole, isRetry = false) => {
    const url = process.env.FOODERP_BACKEND_URL;
    if (!url) return;
    
    const role = getFoodERPRole(msaasRole);

    try {
        const response = await safeFetch(`${url}/api/sso/provision-user`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ tenantId, userId, email, name, role }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMsg = `[FoodERP] User Provision failed: ${data.error || response.statusText}`;
            console.warn(errorMsg);
            throw new Error(errorMsg);
        }
        return true;
    } catch (error) {
        console.warn(`[FoodERP] Network error: ${error.message}`);
        throw error;
    }
};

export const updateFoodERPRole = async (tenantId, userId, msaasRole, isRetry = false) => {
    const url = process.env.FOODERP_BACKEND_URL;
    if (!url) return;

    const role = getFoodERPRole(msaasRole);

    try {
        const response = await safeFetch(`${url}/api/sso/update-role`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ tenantId, userId, role }),
        });
        if (!response.ok && !isRetry) await recordFailure("UPDATE_ROLE", { tenantId, userId, msaasRole }, response.statusText);
        return response.ok;
    } catch (error) {
        if (!isRetry) await recordFailure("UPDATE_ROLE", { tenantId, userId, msaasRole }, error.message);
        return false;
    }
};

export const deprovisionFoodERPUser = async (tenantId, userId, isRetry = false) => {
    const url = process.env.FOODERP_BACKEND_URL;
    if (!url) return;

    try {
        const response = await safeFetch(`${url}/api/sso/deprovision`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ tenantId, userId }),
        });
        if (!response.ok && !isRetry) await recordFailure("DEPROVISION_USER", { tenantId, userId }, response.statusText);
        return response.ok;
    } catch (error) {
        if (!isRetry) await recordFailure("DEPROVISION_USER", { tenantId, userId }, error.message);
        return false;
    }
};

export const deprovisionFoodERPTenant = async (tenantId, isRetry = false) => {
    const url = process.env.FOODERP_BACKEND_URL;
    if (!url) return;

    try {
        const response = await safeFetch(`${url}/api/sso/deprovision-franchise`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ tenantId }),
        });
        if (!response.ok && !isRetry) await recordFailure("DEPROVISION_TENANT", { tenantId }, response.statusText);
        return response.ok;
    } catch (error) {
        if (!isRetry) await recordFailure("DEPROVISION_TENANT", { tenantId }, error.message);
        return false;
    }
};
