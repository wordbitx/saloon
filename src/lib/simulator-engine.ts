import {
  Booking,
  RepeatCustomer,
  SalonSettings,
  Service,
} from "@/types/salon";

export interface SimulatorState {
  step:
    | "awaiting_service"
    | "consulting_service_details"
    | "awaiting_stylist"
    | "awaiting_slot_date"
    | "awaiting_slot_time"
    | "awaiting_name"
    | "booking_confirmed"
    | "owner_override";
  activeBranch?: string;
  selectedService?: string;
  selectedServiceId?: string;
  basePrice?: number;
  selectedPrice?: number;
  selectedStylist?: string;
  selectedDate?: string;
  selectedTime?: string;
  customerName?: string;
  customerPhone?: string;
  conversationBreadcrumbs: string[];
}

export interface SimulatorMessage {
  id: string;
  sender: "customer" | "assistant" | "owner_override";
  text: string;
  timestamp: string;
  options?: string[];
  isAudio?: boolean;
  audioDuration?: string;
  audioSummary?: string;
}

export interface EngineResult {
  reply: SimulatorMessage;
  nextState: SimulatorState;
  newBooking?: Booking;
}

export class SimulatorEngine {
  static pushBreadcrumb(crumb: string, list?: string[]): string[] {
    const existing = list ? [...list] : [];
    if (!existing.includes(crumb)) {
      existing.push(crumb);
    }
    return existing;
  }

  static getTime(): string {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  static processMessage(
    userText: string,
    state: SimulatorState,
    settings: SalonSettings,
    repeatCustomers: RepeatCustomer[]
  ): EngineResult {
    const raw = userText.trim();
    const low = raw.toLowerCase();
    const time = this.getTime();
    const msgId = `msg-${Date.now()}`;

    // 1. RATE LIST & PRICES
    if (
      low.includes("rate list") ||
      low.includes("rates") ||
      low.includes("price list") ||
      low.includes("prices") ||
      low.includes("charges") ||
      low.includes("kitne ka") ||
      low.includes("kitne ki") ||
      low.includes("menu") ||
      low.includes("services list") ||
      low.includes("cost")
    ) {
      const hair = settings.services
        .filter((s) => s.category === "Hair")
        .map((s) => `• *${s.name}:* PKR ${s.pricePKR.toLocaleString()}`)
        .join("\n");
      const skin = settings.services
        .filter((s) => s.category === "Skin & Facial")
        .map((s) => `• *${s.name}:* PKR ${s.pricePKR.toLocaleString()}`)
        .join("\n");
      const bridal = settings.services
        .filter((s) => s.category === "Makeup & Bridal")
        .map((s) => `• *${s.name}:* PKR ${s.pricePKR.toLocaleString()}`)
        .join("\n");
      const nails = settings.services
        .filter((s) => s.category === "Nails")
        .map((s) => `• *${s.name}:* PKR ${s.pricePKR.toLocaleString()}`)
        .join("\n");

      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `📋 *Official Rate List — ${settings.name} (${settings.area}):*\n\n💇‍♀️ *Hair & Styling:*\n${hair}\n\n🌟 *Skin & Clinical Aesthetics:*\n${skin}\n\n👰 *Bridal & Event Glam:*\n${bridal}\n\n💅 *Nails & Spa:*\n${nails}\n\n💡 *Note:* Sab treatments mein sanitized equipment aur imported products istemal hote hain. Kis service ke liye slot book karein?`,
          timestamp: time,
          options: [
            "HydraFacial Deep Glow (PKR 7,500)",
            "Signature Balayage (PKR 16,500)",
            "Signature Bridal Makeup (PKR 45,000)",
            "Signature Haircut (PKR 3,500)",
            "Deals & Discount Packages Dekhein",
          ],
        },
        nextState: {
          ...state,
          step: state.selectedService ? state.step : "awaiting_service",
          conversationBreadcrumbs: this.pushBreadcrumb("Rate List Viewed", state.conversationBreadcrumbs),
        },
      };
    }

    // 2. DEALS & PACKAGES
    if (
      low.includes("deal") ||
      low.includes("deals") ||
      low.includes("package") ||
      low.includes("packages") ||
      low.includes("discount") ||
      low.includes("offer") ||
      low.includes("bundle")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `🎁 *WordbitX Exclusive Salon Packages & Value Bundles:*

1. 🌟 *Pre-Bridal Luxury Glow Bundle:*
Barat Signature Makeup + 7-Step Pre-Bridal HydraFacial + Spa Mani-Pedi
💰 *Bundle Price: PKR 52,000* ~~(Original: PKR 64,500)~~ *(Save PKR 12,500)*

2. 💇‍♀️ *Color Transformation Package:*
Signature Balayage + Olaplex Bond Protector + Post-Color Deep Moisture Masque
💰 *Bundle Price: PKR 22,000* ~~(Original: PKR 25,500)~~ *(Save PKR 3,500)*

3. 💅 *Weekend Glam Refresh:*
Precision Haircut + Ceramic Blowdry + Luxury Spa Mani-Pedi
💰 *Bundle Price: PKR 7,500* ~~(Original: PKR 9,500)~~ *(Save PKR 2,000)*

Konsi deal aap ke liye lock karein?`,
          timestamp: time,
          options: [
            "Pre-Bridal Glow Bundle (PKR 52,000)",
            "Color Transformation (PKR 22,000)",
            "Weekend Glam Refresh (PKR 7,500)",
            "Normal Rate List Dekhein",
          ],
        },
        nextState: {
          ...state,
          step: "consulting_service_details",
          activeBranch: "bridal_glam",
          conversationBreadcrumbs: this.pushBreadcrumb("Packages & Deals", state.conversationBreadcrumbs),
        },
      };
    }

    // 3. STYLISTS & STAFF
    if (
      low.includes("stylist") ||
      low.includes("stylists") ||
      low.includes("staff") ||
      low.includes("artist") ||
      low.includes("beautician") ||
      low.includes("colorist") ||
      low.includes("kaun hai") ||
      low.includes("who is available")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `👩‍🎨 *Our Senior Stylists & Certified Experts:*\n\n${settings.stylists
            .map(
              (s) =>
                `• ⭐ **${s.name}** — *${s.specialty}*\n  (Available: ${s.availableDays.slice(0, 4).join(", ")})`
            )
            .join("\n\n")}\n\nAap apni pasandeeda specialist select kar sakti hain — un ke sath priority chair assign ho jaye gi! Kis specialist se booking chahein gi?`,
          timestamp: time,
          options: [
            "Stylist Hina (Balayage & Color)",
            "Stylist Sana (Haircuts & Styling)",
            "Stylist Zainab (Facials & Skin)",
            "Stylist Aliya (Bridal Makeup)",
            "Any Senior Stylist",
          ],
        },
        nextState: {
          ...state,
          step: state.selectedService ? "awaiting_stylist" : "awaiting_service",
          conversationBreadcrumbs: this.pushBreadcrumb("Stylists List", state.conversationBreadcrumbs),
        },
      };
    }

    // 4. LOCATION & BRANCHES
    if (
      low.includes("location") ||
      low.includes("address") ||
      low.includes("kahan") ||
      low.includes("kidhar") ||
      low.includes("branch") ||
      low.includes("map") ||
      low.includes("pin") ||
      low.includes("rasta") ||
      low.includes("parking")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `📍 *Salon Locations & Branches in Lahore:*\n\n${settings.branches
            .map((b) => `• 📍 **${b.name}:** ${b.area}`)
            .join("\n")}\n\n🚗 *Flagship Address:* ${settings.address}\n• *Landmark:* Main Commercial Sector, Lahore\n• *Parking:* Dedicated client valet & basement parking available.\n\nKya hum WhatsApp par direct Google Maps live location share karein?`,
          timestamp: time,
          options: state.selectedService
            ? [`Continue Booking (${state.selectedService})`, "Send Google Maps Pin", "Change Branch"]
            : ["DHA Phase 5 Flagship Book Karein", "Gulberg Branch Slot Dekhein", "Opening Timings Batayein"],
        },
        nextState: {
          ...state,
          conversationBreadcrumbs: this.pushBreadcrumb("Location Checked", state.conversationBreadcrumbs),
        },
      };
    }

    // 5. TIMINGS & OFF DAYS
    if (
      low.includes("timing") ||
      low.includes("timings") ||
      low.includes("khulne") ||
      low.includes("khula") ||
      low.includes("band") ||
      low.includes("open") ||
      low.includes("close") ||
      low.includes("hours") ||
      low.includes("off day") ||
      low.includes("sunday")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `⏰ *Salon Hours & Operating Schedule:*\n\n• **Regular Timings:** ${settings.openingTime} se ${settings.closingTime} tak (Daily)\n• **Weekly Off-Day:** ${settings.offDays.join(", ")} ko salon band hota hai.\n• **Sunday:** Open regular hours (Weekend rush hota hai, advance booking recommended hai!)\n\nAap ko aaj sham ya kal ka slot chahiye?`,
          timestamp: time,
          options: ["Today Evening (Rush Hour Slot)", "Tomorrow Afternoon Slot", "Weekend Slot (Saturday)", "Check Rate List"],
        },
        nextState: {
          ...state,
          conversationBreadcrumbs: this.pushBreadcrumb("Timings Verified", state.conversationBreadcrumbs),
        },
      };
    }

    // 6. CANCELLATION REQUESTS
    if (
      low.includes("cancel") ||
      low.includes("nahi aa sakti") ||
      low.includes("nahi aa sakta") ||
      low.includes("cancle") ||
      low.includes("drop booking") ||
      low.includes("reschedule")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `Ji theek hai, aap ki booking cancel kar di gayi hai! Koi issue nahi 🙂\n\nHumara automated waitlist engine yeh khaali slot waitlist par maujood aglay guest ko offer kar raha hai taake salon chair khaali na jaye. Jab bhi dobara aana ho, WhatsApp par message kijiyega!`,
          timestamp: time,
          options: ["Naya Slot Book Karein", "Rate List Dekhein", "Branch Locations"],
        },
        nextState: {
          ...state,
          step: "awaiting_service",
          conversationBreadcrumbs: this.pushBreadcrumb("Booking Cancelled & Backfilled", state.conversationBreadcrumbs),
        },
      };
    }

    // 7. REPEAT CUSTOMER RECOGNITION
    const repeatMatch = repeatCustomers.find((c) => low.includes(c.name.toLowerCase()));
    if (repeatMatch || low.includes("ayesha") || low.includes("repeat client")) {
      const client = repeatMatch || repeatCustomers[0];
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `Walaikum Assalam ${client.name}! 😊 Khush aamdeed dobara.\n\nRecord ke mutabiq last visit par aap ne **${client.lastService}** (${client.preferredStylist} ke sath) karwaya tha.\n\nIs baar bhi wohi service schedule karein ya koi nayi treatment leni hai?`,
          timestamp: time,
          options: [
            `Same Service (${client.lastService})`,
            "Nayi Service Select Karein",
            `Stylist ${client.preferredStylist} ke sath Slot Dekhein`,
            "Rate List Dekhein",
          ],
        },
        nextState: {
          ...state,
          step: "consulting_service_details",
          customerName: client.name,
          customerPhone: client.phone,
          selectedStylist: client.preferredStylist,
          conversationBreadcrumbs: this.pushBreadcrumb("Repeat Client Memory Triggered", state.conversationBreadcrumbs),
        },
      };
    }

    // 8. BRIDAL / BARAT CONSULTATION
    if (
      low.includes("bridal") ||
      low.includes("dulhan") ||
      low.includes("barat") ||
      low.includes("walima") ||
      low.includes("nikkah") ||
      low.includes("shadi")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `👰 *Signature Bridal & Wedding Glam Consultation*\n\nMubarak ho! Barat / Walima Signature Bridal package **PKR 45,000** hai.\n\n💎 *Senior Artist Aliya Noor* recommend karti hain:\n• Pre-Bridal HydraFacial Treatment (Wedding se 3 din pehle glass skin ke liye)\n• Bridal Trial & Dupatta Drape Setting Session (PKR 10,000)\n• Bridal Mehndi Artist add-on (PKR 7,000)\n\nKya wedding date lock karein aur consultation slot reserve karein?`,
          timestamp: time,
          options: [
            "Signature Bridal Package (PKR 45,000)",
            "Full Bridal + Pre-Bridal Glow Bundle (PKR 52,000)",
            "Pehle Bridal Trial Book Karein (PKR 10,000)",
            "Wedding Date Discuss Karein",
          ],
        },
        nextState: {
          ...state,
          step: "consulting_service_details",
          activeBranch: "branch_bridal",
          selectedService: "Signature Bridal Makeup (Barat/Walima)",
          basePrice: 45000,
          selectedPrice: 45000,
          conversationBreadcrumbs: this.pushBreadcrumb("Branch: Bridal Glam & Upsell", state.conversationBreadcrumbs),
        },
      };
    }

    // 9. BALAYAGE & HAIR COLOR
    if (
      low.includes("balayage") ||
      low.includes("color") ||
      low.includes("colour") ||
      low.includes("highlights") ||
      low.includes("dye") ||
      low.includes("ombre")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `✨ *Signature Balayage & Color Consultation*\n\nBehtareen dimensional finish ke liye hamari Master Colorist **Hina Malik** pehle hair length aur texture verify karti hain:\n\n1. *Shoulder Length:* Base PKR 16,500\n2. *Mid-Back / Waist Length:* PKR 19,500 (extra toner + gloss shamil)\n\nAap ke baal kis length ke hain, aur kya Olaplex bond repair add karna chahein gi?`,
          timestamp: time,
          options: [
            "Shoulder Length (PKR 16,500)",
            "Mid-Back / Long Hair (PKR 19,500)",
            "Long Hair + Olaplex Bond Protection (PKR 22,000)",
            "Stylist Hina Malik se Consult Karein",
          ],
        },
        nextState: {
          ...state,
          step: "consulting_service_details",
          activeBranch: "branch_balayage",
          selectedService: "Balayage & Hair Gloss Treatment",
          basePrice: 16500,
          selectedPrice: 16500,
          conversationBreadcrumbs: this.pushBreadcrumb("Branch: Balayage & Length Customization", state.conversationBreadcrumbs),
        },
      };
    }

    // 10. HYDRAFACIAL & SKIN
    if (
      low.includes("hydra") ||
      low.includes("facial") ||
      low.includes("skin") ||
      low.includes("cleansing") ||
      low.includes("glow")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `🌟 *HydraFacial Clinical Deep Glow Treatment*\n\nMedical-grade 7-step extraction + hydration session hai (Duration: 60 mins). Instant glow aur event readiness ke liye best hai.\n\n• Standard Session: PKR 7,500\n• Clinical Anti-Aging Peptide Serum + LED Light Therapy add-on: PKR 10,000\n\nKonsa option schedule karein?`,
          timestamp: time,
          options: [
            "Standard HydraFacial Session (PKR 7,500)",
            "HydraFacial + LED Therapy & Peptides (PKR 10,000)",
            "Skin Esthetician Zainab ke sath Slot Dekhein",
          ],
        },
        nextState: {
          ...state,
          step: "consulting_service_details",
          activeBranch: "branch_hydrafacial",
          selectedService: "HydraFacial Deep Glow Session",
          basePrice: 7500,
          selectedPrice: 7500,
          conversationBreadcrumbs: this.pushBreadcrumb("Branch: HydraFacial & Serums", state.conversationBreadcrumbs),
        },
      };
    }

    // 11. HAIRCUT & BLOWDRY
    if (
      low.includes("haircut") ||
      low.includes("hair cut") ||
      low.includes("cutting") ||
      low.includes("blowdry") ||
      low.includes("trim") ||
      low.includes("baal")
    ) {
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `💇‍♀️ *Signature Haircut & Ceramic Blowdry Session*\n\nFace shape ke mutabiq custom precision haircut with botanical hair wash aur ceramic blow-dry styling.\n• Price: **PKR 3,500** (~45 mins)\n• Stylist: Senior Stylist Sana Tariq available hain.\n\nAap ko kab ka time suit karega?`,
          timestamp: time,
          options: [
            "Today · 04:30 PM (Immediate Chair)",
            "Today · 06:00 PM",
            "Tomorrow · 12:00 PM (Afternoon)",
            "Weekend (Saturday 03:00 PM)",
          ],
        },
        nextState: {
          ...state,
          step: "awaiting_slot_time",
          selectedService: "Signature Haircut & Ceramic Blowdry",
          selectedServiceId: "srv-3",
          basePrice: 3500,
          selectedPrice: 3500,
          selectedStylist: "Sana Tariq",
          conversationBreadcrumbs: this.pushBreadcrumb("Branch: Haircut & Blowdry", state.conversationBreadcrumbs),
        },
      };
    }

    // 12. LENGTH OPTIONS OR ADD-ON SELECTED
    if (
      low.includes("shoulder length") ||
      low.includes("mid-back") ||
      low.includes("long hair") ||
      low.includes("olaplex") ||
      low.includes("standard hydrafacial") ||
      low.includes("led therapy")
    ) {
      let price = state.selectedPrice || 16500;
      if (low.includes("19,500") || low.includes("mid-back")) price = 19500;
      if (low.includes("22,000") || low.includes("olaplex")) price = 22000;
      if (low.includes("7,500")) price = 7500;
      if (low.includes("10,000")) price = 10000;

      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `Noted! Custom treatment lock ho gaya (**PKR ${price.toLocaleString()}**).\n\nStylist **Hina Malik** ke pas yeh slots available hain:\n1. *Today · 04:30 PM (Rush Hour)*\n2. *Today · 06:00 PM*\n3. *Tomorrow · 12:00 PM*\n\nKonsa slot block kar dein?`,
          timestamp: time,
          options: [
            "Today · 04:30 PM (Rush Hour)",
            "Today · 06:00 PM",
            "Tomorrow · 12:00 PM",
            "Tomorrow · 03:30 PM",
          ],
        },
        nextState: {
          ...state,
          step: "awaiting_slot_time",
          selectedPrice: price,
          selectedStylist: "Hina Malik",
          conversationBreadcrumbs: this.pushBreadcrumb("Treatment Options Configured", state.conversationBreadcrumbs),
        },
      };
    }

    // 13. SLOT TIME SELECTED
    if (
      low.includes("pm") ||
      low.includes("am") ||
      low.includes("today") ||
      low.includes("tomorrow") ||
      low.includes("aaj") ||
      low.includes("kal") ||
      low.includes("04:30") ||
      low.includes("06:00") ||
      low.includes("12:00") ||
      low.includes("05:30") ||
      low.includes("rush hour") ||
      state.step === "awaiting_slot_time"
    ) {
      const selectedSlot = raw.includes("Tomorrow") ? "Tomorrow · 12:00 PM" : "Today · 04:30 PM";
      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `Slot reserve kar liya gaya hai: **${selectedSlot}** (${state.selectedStylist || "Senior Stylist"}).\n\nBooking confirm karne ke liye please apna **Naam aur Contact Number** bata dein?`,
          timestamp: time,
          options: [
            "Sana Tariq (0321-4455219)",
            "Mahnoor Bilal (0300-8472911)",
            "Ayesha Khan",
          ],
        },
        nextState: {
          ...state,
          step: "awaiting_name",
          selectedTime: selectedSlot,
          conversationBreadcrumbs: this.pushBreadcrumb(`Slot Selected (${selectedSlot})`, state.conversationBreadcrumbs),
        },
      };
    }

    // 14. NAME RECEIVED -> CONFIRMATION & BOOKING CREATION
    if (
      state.step === "awaiting_name" ||
      low.includes("03") ||
      low.startsWith("sana") ||
      low.startsWith("mahnoor") ||
      low.startsWith("mera naam") ||
      low.startsWith("my name is")
    ) {
      const name = raw.replace(/^(mera naam|my name is)\s+/i, "").split("(")[0].trim() || "Guest Client";
      const svcName = state.selectedService || "Balayage & Hair Gloss Treatment";
      const price = state.selectedPrice || 16500;
      const slot = state.selectedTime || "Today · 04:30 PM";
      const stylist = state.selectedStylist || "Hina Malik";

      const newBooking: Booking = {
        id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        salonId: settings.id,
        customerName: name,
        customerPhone: "+92 300 0000011",
        serviceName: svcName,
        stylistName: stylist,
        branchName: settings.branches[0]?.name || "DHA Phase 5",
        date: slot.includes("Tomorrow") ? "Tomorrow" : "Today",
        time: slot.split("·")[1]?.trim() || "04:30 PM",
        status: "confirmed",
        amountPKR: price,
        channel: "whatsapp_night",
        createdAt: new Date().toISOString(),
        isRecovered: true,
        notes: "Live WhatsApp Simulator Recovery",
      };

      return {
        reply: {
          id: msgId,
          sender: "assistant",
          text: `🎉 *Booking Confirmed! — ${settings.name}*\n\n• 👤 *Customer:* ${name}\n• 💇‍♀️ *Service:* ${svcName}\n• 💰 *Amount:* PKR ${price.toLocaleString()}\n• ⏰ *Slot:* ${slot}\n• 👩‍🎨 *Stylist:* ${stylist}\n• 📍 *Branch:* ${settings.branches[0]?.name}\n\n✅ Appointment se 2 ghante pehle aap ko automated WhatsApp reminder aa jaye ga. Welcome to ${settings.name}!`,
          timestamp: time,
          options: [
            "Check Owner Dashboard Report",
            "Send Google Maps Location",
            "Book Another Service",
          ],
        },
        nextState: {
          ...state,
          step: "booking_confirmed",
          customerName: name,
          conversationBreadcrumbs: this.pushBreadcrumb("Booking Confirmed & Telemetry Synced", state.conversationBreadcrumbs),
        },
        newBooking,
      };
    }

    // 15. DEFAULT HELPFUL FALLBACK
    return {
      reply: {
        id: msgId,
        sender: "assistant",
        text: `Assalam o Alaikum! ${settings.name} mein khush-aamdeed. Main aap ke sawal ka jawab dene aur appointment schedule karne ke liye ready hoon.\n\nAap rate list dekhna chahti hain ya kisi service (Haircut, Balayage, HydraFacial, Bridal) ka slot check karna hai?`,
        timestamp: time,
        options: [
          "Rate List Dekhein",
          "HydraFacial Glow (PKR 7,500)",
          "Signature Balayage (PKR 16,500)",
          "Salon Location & Address",
          "Stylists ki List",
        ],
      },
      nextState: {
        ...state,
        step: "awaiting_service",
        conversationBreadcrumbs: this.pushBreadcrumb("Assistance Menu Sent", state.conversationBreadcrumbs),
      },
    };
  }

  static processVoiceNote(
    transcript: string,
    state: SimulatorState,
    settings: SalonSettings,
    repeatCustomers: RepeatCustomer[]
  ): {
    customerMessage: SimulatorMessage;
    assistantReply: SimulatorMessage;
    nextState: SimulatorState;
  } {
    const time = this.getTime();

    const customerMessage: SimulatorMessage = {
      id: `vn-${Date.now()}`,
      sender: "customer",
      text: `🎤 Voice Note (0:18s)\n"${transcript}"`,
      timestamp: time,
      isAudio: true,
      audioDuration: "0:18",
    };

    const assistantReply: SimulatorMessage = {
      id: `vn-reply-${Date.now()}`,
      sender: "assistant",
      text: `🎙️ *Voice Note Summary (WordbitX Audio Engine):*\n\n✓ *Customer Request:* Saturday afternoon ko HydraFacial Glow + Blowdry booking with Stylist Hina Malik.\n\nAssalam-o-Alaikum! Aap ka voice message mil gaya hai. Saturday ko Hina Malik ke pas afternoon slots yeh available hain:\n1. *Saturday · 02:00 PM*\n2. *Saturday · 04:00 PM*\n\nCombo package HydraFacial Glow + Ceramic Blowdry: **PKR 10,000** (Save PKR 1,000). Konsa time lock kar dein?`,
      timestamp: time,
      options: [
        "Saturday · 02:00 PM Slot",
        "Saturday · 04:00 PM Slot",
        "Change Stylist",
        "Check Rate List",
      ],
      audioSummary: transcript,
    };

    const nextState: SimulatorState = {
      ...state,
      step: "awaiting_slot_time",
      selectedService: "HydraFacial Glow + Blowdry Combo",
      selectedPrice: 10000,
      selectedStylist: "Hina Malik",
      conversationBreadcrumbs: this.pushBreadcrumb("Voice Note Auto-Summarized", state.conversationBreadcrumbs),
    };

    return {
      customerMessage,
      assistantReply,
      nextState,
    };
  }
}
