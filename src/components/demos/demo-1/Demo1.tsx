"use client";

import { useState } from "react";
import { AdminPanel } from "@/components/common/AdminPanel";
import { Phone } from "@/components/common/Phone";
import styles from "./Demo1.module.css";

// Export default component
export default function Demo1() {
  const [currentUsers, setCurrentUsers] = useState({
    user1: "1",
    user2: "2",
  });

  return (
    <div className={styles.demoContainer}>
      <div className={styles.phonesContainer}>
        <div className={styles.phoneWrapper}>
          <Phone
            userId={currentUsers.user1}
            initialColor="rose"
            demoVersion={1}
          />
        </div>

        <div className={styles.phoneWrapper}>
          <Phone
            userId={currentUsers.user2}
            initialColor="blue"
            demoVersion={1}
            isRight={true}
          />
        </div>
      </div>

      <AdminPanel
        demoVersion={1}
      />
    </div>
  );
}
