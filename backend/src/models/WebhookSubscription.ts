import { Schema, model, Document, Types } from "mongoose";

export interface IWebhookSubscription extends Document {
  companyId: Types.ObjectId;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSubscriptionSchema = new Schema<IWebhookSubscription>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    url: { type: String, required: true, trim: true },
    secret: { type: String, required: true },
    events: [
      {
        type: String,
        enum: ["assessment.submitted", "assessment.scored", "company.verified", "ping"],
        default: ["assessment.submitted"],
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const WebhookSubscription = model<IWebhookSubscription>(
  "WebhookSubscription",
  WebhookSubscriptionSchema
);
