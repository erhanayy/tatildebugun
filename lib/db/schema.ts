import { pgTable, text, timestamp, boolean, uuid, index, varchar, doublePrecision, integer } from "drizzle-orm/pg-core";

// Kullanıcı Rolleri: 'admin' (Yönetici), 'host' (Otel/Tesis/Tur Sahibi), 'guest' (Tatilci/Misafir)
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").unique(),
    phoneNumber: text("phone_number"),
    password: text("password").notNull(),
    role: text("role", { enum: ["admin", "host", "guest"] }).default("guest").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    baseCountry: varchar("base_country", { length: 2 }).default("TR"),
    baseCity: varchar("base_city", { length: 100 }).default("İstanbul"),
    forcePasswordChange: boolean("force_password_change").default(false).notNull(),
    verificationCode: text("verification_code"),
    verificationCodeExpiresAt: timestamp("verification_code_expires_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    phoneIdx: index("users_phone_idx").on(table.phoneNumber),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// --- Ziyaretler / Geziler Tablosu ---
export const visits = pgTable(
  "visits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    countryCode: varchar("country_code", { length: 10 }).notNull(), // 'ES', 'TR', 'KKTC' vb.
    countryName: text("country_name").notNull(),
    cityName: text("city_name").notNull(),
    districtName: text("district_name"), // İlçe bilgisi (Opsiyonel: Kadıköy, Bodrum vb.)
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),

    // Tarih Seçenekleri: 'exact' (Kesin Başlangıç-Bitiş), 'month_year' (Yıl-Ay), 'timeless' (Tarihsiz / Zamansız)
    dateType: text("date_type", { enum: ["exact", "month_year", "timeless"] }).notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    visitYear: integer("visit_year"),
    visitMonth: integer("visit_month"),

    // Kalış Süresi ve Amaç (Zamansız kayıtlarda 0 gün)
    stayDurationDays: integer("stay_duration_days").default(0).notNull(),
    visitType: text("visit_type", { enum: ["touristic", "business"] })
      .default("touristic")
      .notNull(),

    // Paylaşım ve Gizlilik
    visibility: text("visibility", { enum: ["public", "friends", "family"] })
      .default("public")
      .notNull(),

    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("visits_user_idx").on(table.userId),
    countryIdx: index("visits_country_idx").on(table.countryCode),
    cityIdx: index("visits_city_idx").on(table.cityName),
  })
);

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;

// --- Sosyal Bağlantılar (Arkadaş & Aile - Faz 2 Hazırlığı) ---
export const userConnections = pgTable(
  "user_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    targetUserId: uuid("target_user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    relationshipType: text("relationship_type", { enum: ["friend", "family"] }).notNull(),
    status: text("status", { enum: ["pending", "accepted", "blocked"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userConnIdx: index("user_conn_idx").on(table.userId, table.targetUserId),
  })
);

export type UserConnection = typeof userConnections.$inferSelect;
export type NewUserConnection = typeof userConnections.$inferInsert;

// --- 4. Rotalar / Seyahatler (Trips) Tablosu ---
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(), // Örn: 'Büyük İtalya Turu'
    description: text("description"),
    status: text("status", { enum: ["planned", "completed"] }).default("completed").notNull(),
    transportType: text("transport_type", {
      enum: ["flight", "car", "train", "bus", "motorbike", "bicycle", "mixed"],
    })
      .default("mixed")
      .notNull(),
    visibility: text("visibility", { enum: ["public", "friends", "family"] })
      .default("public")
      .notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tripUserIdx: index("trips_user_idx").on(table.userId),
    tripStatusIdx: index("trips_status_idx").on(table.status),
  })
);

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;

// --- 5. Rota Durakları (Trip Stops) Tablosu ---
export const tripStops = pgTable(
  "trip_stops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .references(() => trips.id, { onDelete: "cascade" })
      .notNull(),
    visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }),
    cityName: text("cityName").notNull(),
    countryCode: varchar("country_code", { length: 10 }).notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    stopOrder: integer("stop_order").notNull(), // 0: origin, 1..N: stops, N+1: return
    stopType: varchar("stop_type", { length: 20 }).default("stop").notNull(), // 'origin' | 'stop' | 'return'
    transportType: varchar("transport_type", { length: 30 }).default("flight"), // 'flight' | 'car' | 'train' | 'bus'
    arrivalDate: timestamp("arrival_date"),
    departureDate: timestamp("departure_date"),
    notes: text("notes"),
  },
  (table) => ({
    tripStopTripIdx: index("trip_stops_trip_idx").on(table.tripId),
    tripStopOrderIdx: index("trip_stops_order_idx").on(table.tripId, table.stopOrder),
  })
);

export type TripStop = typeof tripStops.$inferSelect;
export type NewTripStop = typeof tripStops.$inferInsert;

// --- 6. Sosyal Beğeniler / Reaksiyonlar Tablosu ---
export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    targetType: text("target_type", { enum: ["visit", "trip"] }).notNull(),
    targetId: text("target_id").notNull(),
    reactionType: text("reaction_type", { enum: ["heart", "plane", "palm", "clap"] })
      .default("heart")
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    reactionTargetIdx: index("reactions_target_idx").on(table.targetType, table.targetId),
    reactionUserIdx: index("reactions_user_idx").on(table.userId),
  })
);

export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;

// --- 7. Sosyal Yorumlar Tablosu ---
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    targetType: text("target_type", { enum: ["visit", "trip"] }).notNull(),
    targetId: text("target_id").notNull(),
    commentText: text("comment_text").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    commentTargetIdx: index("comments_target_idx").on(table.targetType, table.targetId),
  })
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// --- 8. Gezgin Eşleşmesi ve Tanışma Talepleri (Travel Match Requests) ---
export const travelMatches = pgTable(
  "travel_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    receiverId: uuid("receiver_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    cityName: text("cityName").notNull(),
    overlapStartDate: timestamp("overlap_start_date"),
    overlapEndDate: timestamp("overlap_end_date"),
    status: text("status", { enum: ["pending", "accepted", "declined"] })
      .default("pending")
      .notNull(),
    introMessage: text("intro_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    matchUsersIdx: index("travel_matches_users_idx").on(table.senderId, table.receiverId),
    matchCityIdx: index("travel_matches_city_idx").on(table.cityName),
  })
);

export type TravelMatch = typeof travelMatches.$inferSelect;
export type NewTravelMatch = typeof travelMatches.$inferInsert;

// --- 9. Bildirimler ve Rozet Sistemi (Notifications & Badges) ---
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    actorId: uuid("actor_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(), // 'reaction', 'comment', 'match_request', 'match_accepted'
    targetType: varchar("target_type", { length: 50 }), // 'visit', 'trip', 'match'
    targetId: varchar("target_id", { length: 255 }),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userUnreadIdx: index("notifications_user_unread_idx").on(table.userId, table.isRead),
    userCreatedIdx: index("notifications_user_created_idx").on(table.userId, table.createdAt),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// --- 10. Gezginler Arası Özel Mesajlaşma (Direct Messaging / Travel Chat) ---
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    senderId: uuid("sender_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    receiverId: uuid("receiver_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    matchId: uuid("match_id").references(() => travelMatches.id, { onDelete: "set null" }),
    messageText: text("message_text").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    messagesConvIdx: index("messages_conversation_idx").on(table.senderId, table.receiverId, table.createdAt),
    messagesUnreadIdx: index("messages_unread_idx").on(table.receiverId, table.isRead),
  })
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;


