import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          Building Rock-Solid Encrypted Applications
        </p>
      </div>

      <div className={styles.center}>
        <h1 className={styles.title}>
          Rock-Solid Encryption
        </h1>
      </div>

      <div className={styles.grid}>
        <Link
          href="/presentation"
          className={styles.card}
        >
          <h2>
            Start Presentation <span>-&gt;</span>
          </h2>
          <p>View the presentation with Reveal.js.</p>
        </Link>



        <Link
          href="/demos/1"
          className={styles.card}
        >
          <h2>
            Demo 1 <span>-&gt;</span>
          </h2>
          <p>Basic chat application with plaintext messages.</p>
        </Link>

        <Link
          href="/demos/2"
          className={styles.card}
        >
          <h2>
            Demo 2 <span>-&gt;</span>
          </h2>
          <p>Chat with server-side encryption.</p>
        </Link>

        <Link
          href="/demos/3"
          className={styles.card}
        >
          <h2>
            Demo 3 <span>-&gt;</span>
          </h2>
          <p>Chat with end-to-end encryption.</p>
        </Link>
      </div>
    </main>
  )
}
