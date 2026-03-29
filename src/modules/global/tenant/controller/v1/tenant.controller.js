export const resolver = async (req, res) => {
  
    
    try {

        res.json({
            msg: "Tenant resolved",
            tenant: req.tenant,
        });

    } catch (error) {

    }
};