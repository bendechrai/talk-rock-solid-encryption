"use client";

import { useState } from "react";
import { AdminPanel } from "@/components/common/AdminPanel";
import { Phone } from "@/components/common/Phone";
import { SymmetricEncryptionPanel } from "./SymmetricEncryptionPanel";
import styles from "./Demo2.module.css";

export default function Demo2() {
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
            demoVersion={2}
            onChangeUser={(userId) => setCurrentUsers(prev => ({ ...prev, user1: userId }))}
          />
        </div>

        <div className={styles.phoneWrapper}>
          <Phone
            userId={currentUsers.user2}
            initialColor="blue"
            demoVersion={2}
            isRight={true}
            onChangeUser={(userId) => setCurrentUsers(prev => ({ ...prev, user2: userId }))}
          />
        </div>
      </div>

      <AdminPanel demoVersion={2}>
        <SymmetricEncryptionPanel />
      </AdminPanel>
    </div>
  );
}
