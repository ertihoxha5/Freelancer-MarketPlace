import mongoose from "mongoose";

/**
 * Activity Feed - ruhet në MongoDB
 *
 * Përse MongoDB dhe jo MySQL?
 * - Secila aktivitet ka metadata të ndryshme (schema-less)
 * - Append-only writes janë shumë të shpejta
 * - Query-t janë gjithmonë sipas freelancerID + sort nga koha
 * - Nuk ka JOIN-s të nevojshëm
 * - Skalon mirë për volume të madh
 */
const activitySchema = new mongoose.Schema(
  {
    // Kujt i takon ky aktivitet
    freelancerID: {
      type: Number,
      required: true,
      index: true,
    },

    // Lloji i aktivitetit
    eventType: {
      type: String,
      required: true,
      enum: [
        "application_accepted", // Klienti pranoi aplikimin
        "application_rejected", // Klienti refuzoi aplikimin
        "application_submitted", // Freelanceri dërgoi aplikim
        "application_withdrawn", // Freelanceri tërhoqi aplikimin
        "new_message", // Mesazh i ri nga klienti
        "project_completed", // Projekti u kompletua
        "project_cancelled", // Projekti u anulua
        "profile_viewed", // Dikush shikoi profilin
        "review_received", // Vlerësim i ri i marrë
      ],
    },

    // Titulli i shkurtër
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },

    // Mesazhi i plotë
    message: {
      type: String,
      maxlength: 500,
    },

    // Metadata e pasur - çdo eventType ka strukturë të vet
    metadata: {
      // Për application events
      projectID: Number,
      projectTitle: String,
      clientID: Number,
      clientName: String,
      applicationID: Number,
      bidAmount: Number,
      estimatedDays: Number,

      // Për mesazhe
      conversationID: Number,
      senderName: String,
      messagePreview: String,

      // Për reviews
      stars: Number,
      reviewerName: String,

      // URL ku mund të navigojë
      actionUrl: String,
    },

    // A e ka lexuar freelanceri
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Prioriteti i aktivitetit
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Ikona/emoji për UI
    icon: {
      type: String,
      default: "🔔",
    },
  },
  {
    timestamps: true, // createdAt dhe updatedAt automatikisht
    // Index i kombinuar për query-t e zakonshme
  },
);

// Index i kombinuar: gjej aktivitetet e freelancerit, të renditura nga të reja
activitySchema.index({ freelancerID: 1, createdAt: -1 });
activitySchema.index({ freelancerID: 1, isRead: 1 });
activitySchema.index({ freelancerID: 1, eventType: 1 });

// Method instance: shëno si të lexuar
activitySchema.methods.markAsRead = function () {
  this.isRead = true;
  return this.save();
};

// Method statik: shëno të gjitha si të lexuara
activitySchema.statics.markAllReadForFreelancer = function (freelancerID) {
  return this.updateMany(
    { freelancerID, isRead: false },
    { $set: { isRead: true } },
  );
};

// Method statik: fshi të vjetrat (pastrim automatik pas 90 ditëve)
activitySchema.statics.cleanupOld = function () {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
};

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
