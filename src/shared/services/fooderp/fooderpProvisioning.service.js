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

const getFoodERPRole = (msaasRole) => {
    // Top-level Tenant Admins must bootstrap the FoodERP franchise
    // as a "Franchisee" to avoid administrative lockout.
    if (msaasRole === "Tenant Admin") {
        return "Franchisee";
    }

    // For all other roles (e.g. Staff, Manager), MSAAS no longer maps to 
    // FoodERP operational roles. We pass an empty string so FoodERP safely 
    // assigns its own baseline ("Waiter") which a Franchisee can upgrade later.
    return "";
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

export const provisionFoodERPUser = async (email, name = null, tenantId = null, appRole = null, isRetry = false) => {
    const url = process.env.FOODERP_BACKEND_URL;
    if (!url) return;

    // Step 1: Create FoodERP user via /api/sso/provision (FoodERP generates its own GUID)
    try {
        const response = await safeFetch(`${url}/api/sso/provision`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ email, name }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMsg = `[FoodERP] User Provision failed: ${data.error || response.statusText}`;
            console.warn(errorMsg);
            throw new Error(errorMsg);
        }

        // Step 2: Create FranchiseeUsers + OperationalRole via /api/sso/provision-user
        // This endpoint finds the existing user by email and creates the FranchiseeUsers record
        if (tenantId && appRole) {
            try {
                const roleResponse = await safeFetch(`${url}/api/sso/provision-user`, {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify({ email, userId: email, tenantId, name, role: appRole }),
                });
                const roleData = await roleResponse.json().catch(() => ({}));
                if (!roleResponse.ok) {
                    console.warn(`[FoodERP] FranchiseeUsers provision warning: ${roleData.error || roleResponse.statusText}`);
                }
            } catch (roleErr) {
                console.warn(`[FoodERP] FranchiseeUsers provision warning: ${roleErr.message}`);
            }
        }

        return data;
    } catch (error) {
        console.warn(`[FoodERP] Network error: ${error.message}`);
        throw error;
    }
};

export const updateFoodERPRole = async (tenantId, userId, msaasRole, isRetry = false) => {
    // Deprecated: MSAAS no longer syncs roles to FoodERP.
    // FoodERP handles its own operational roles independently.
    return true;
};

export const deprovisionFoodERPUser = async (tenantId, userId, email = null, isRetry = false) => {
    const url = process.env.FOODERP_BACKEND_URL;
    if (!url) return;

    try {
        const response = await safeFetch(`${url}/api/sso/deprovision`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ tenantId, userId, email }),
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
