import { getIntegrationTaskModel } from "./integrationTask.model.js";
import { provisionFoodERPTenant, provisionFoodERPUser, updateFoodERPRole, deprovisionFoodERPTenant, deprovisionFoodERPUser } from "./fooderpProvisioning.service.js";

export const startFoodERPIntegrationCron = () => {
    setInterval(async () => {
        try {
            const IntegrationTask = getIntegrationTaskModel();
            const tasks = await IntegrationTask.find({ 
                status: { $ne: "COMPLETED" },
                nextRetryAt: { $lte: new Date() },
                retries: { $lt: 5 }
            });

            for (const task of tasks) {
                let success = false;
                try {
                    if (task.type === "PROVISION_TENANT") {
                        success = await provisionFoodERPTenant(task.payload.tenantId, task.payload.storeName, task.payload.email, true);
                    } else if (task.type === "PROVISION_USER") {
                        success = await provisionFoodERPUser(task.payload.tenantId, task.payload.userId, task.payload.email, task.payload.name, task.payload.msaasRole, true);
                    } else if (task.type === "UPDATE_ROLE") {
                        success = await updateFoodERPRole(task.payload.tenantId, task.payload.userId, task.payload.msaasRole, true);
                    } else if (task.type === "DEPROVISION_TENANT") {
                        success = await deprovisionFoodERPTenant(task.payload.tenantId, true);
                    } else if (task.type === "DEPROVISION_USER") {
                        success = await deprovisionFoodERPUser(task.payload.tenantId, task.payload.userId, true);
                    }
                } catch(e) {
                    success = false;
                }

                if (success) {
                    task.status = "COMPLETED";
                } else {
                    task.retries += 1;
                    task.status = "FAILED";
                    task.nextRetryAt = new Date(Date.now() + Math.pow(2, task.retries) * 60000); 
                }
                await task.save();
            }
        } catch (e) {
            console.error("[CRON] FoodERP retry cron error:", e.message);
        }
    }, 5 * 60 * 1000);
};
