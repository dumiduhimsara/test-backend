import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema({
    shopName: { type: String, required: true },
    ownerName: { type: String, required: true }, 
    phone: { type: String, required: true, unique: true }, 
    shopAddress: { type: String, required: true },
    nicNumber: { type: String, required: true },
    email: { type: String, unique: true, sparse: true }, 
    password: { type: String, required: true }, 
    
    // --- Admin & Subscription Control Fields ---
    
    // 'active' (වැඩ කරන), 'inactive' (ඔයා තාවකාලිකව නැවැත්වූ), 'expired' (සල්ලි ගෙවලා නැති)
    subscriptionStatus: { 
        type: String, 
        enum: ['active', 'inactive', 'expired'], 
        default: 'active' 
    }, 
    
    // ගෙවීම් වලංගු කාලය අවසන් වන දිනය (මෙම දිනය පහු වුණාම Login එක Block කරන්න පුළුවන්)
    expiryDate: { 
        type: Date, 
        default: () => new Date(+new Date() + 30*24*60*60*1000) // Default දින 30ක් ලබා දීම
    },

    // ඔයාට ඕනේ වෙලාවක ඕනෑම කඩයක් පද්ධතියටම ඇතුළු විය නොහැකි ලෙස Block කිරීමට
    isBlocked: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Merchant", merchantSchema);