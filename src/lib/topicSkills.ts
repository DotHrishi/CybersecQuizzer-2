export interface TopicSkillDetail {
  category: string;
  summary: string;
  skills: { title: string; desc: string }[];
}

export const TOPIC_SKILLS_MAP: Record<string, TopicSkillDetail> = {
  'Authentication & Passwords': {
    category: 'Authentication & Passwords',
    summary: 'Mastery over credential protection, entropy, and multi-factor defense systems.',
    skills: [
      { title: 'Multi-Factor Authentication (MFA)', desc: 'Configuring authenticator apps, FIDO2 hardware keys, and backup codes.' },
      { title: 'Passphrase Construction', desc: 'Creating high-entropy passphrases resistant to dictionary and brute-force attacks.' },
      { title: 'Password Manager Security', desc: 'Integrating encrypted vaults, zero-knowledge architecture, and master key safety.' },
      { title: 'Credential Stuffing Defense', desc: 'Mitigating automated reuse attacks across multiple online platforms.' },
    ],
  },
  'Phishing & Social Engineering': {
    category: 'Phishing & Social Engineering',
    summary: 'Advanced detection of deception tactics, spoofed domains, and psychological manipulation.',
    skills: [
      { title: 'Spear Phishing Detection', desc: 'Identifying targeted spoof emails, deceptive headers, and lookalike domains.' },
      { title: 'Malicious URL & Link Auditing', desc: 'Decoding obfuscated hyperlinks, redirect chains, and deceptive anchor text.' },
      { title: 'Social Engineering Resistance', desc: 'Recognizing pretexting, vishing (voice calls), smishing, and urgency triggers.' },
      { title: 'Incident Quarantine Protocol', desc: 'Reporting suspicious communications to security response channels.' },
    ],
  },
  'Network Security & Wi-Fi': {
    category: 'Network Security & Wi-Fi',
    summary: 'Securing wired/wireless channels, public access points, and encrypted transport tunnels.',
    skills: [
      { title: 'Public Wi-Fi Risk Mitigation', desc: 'Safely navigating open networks using encrypted VPN tunnels and HTTPS.' },
      { title: 'WPA3 / Enterprise Encryption', desc: 'Understanding wireless protocol standards and pre-shared key management.' },
      { title: 'Evil Twin & Rogue AP Defense', desc: 'Detecting cloned Wi-Fi hotspots and MITM (Man-in-the-Middle) packet sniffers.' },
      { title: 'DNS & SSL Certificate Auditing', desc: 'Verifying certificate authorities and spotting DNS spoofing attempts.' },
    ],
  },
  'Malware & Ransomware': {
    category: 'Malware & Ransomware',
    summary: 'Defense against malicious executables, extortion payloads, and endpoint compromise.',
    skills: [
      { title: 'Payload Delivery Prevention', desc: 'Stopping drive-by exploits, weaponized macros, and malicious email attachments.' },
      { title: 'Endpoint Threat Detection', desc: 'Leveraging heuristic behavioral monitoring and real-time endpoint scanners.' },
      { title: 'Ransomware Isolation Protocols', desc: 'Isolating compromised devices and maintaining immutable offline backups.' },
      { title: 'Trojan & Spyware Recognition', desc: 'Spotting anomalous background processes, unauthorized keyloggers, and data exfiltration.' },
    ],
  },
  'Data Privacy & Protection': {
    category: 'Data Privacy & Protection',
    summary: 'Safeguarding Personally Identifiable Information (PII) and regulatory compliance principles.',
    skills: [
      { title: 'PII & Sensitive Data Handling', desc: 'Identifying and classifying sensitive identifiers, credentials, and records.' },
      { title: 'Privacy Regulations (DPDP & GDPR)', desc: 'Understanding user consent, right to erasure, and legal data privacy mandates.' },
      { title: 'Data Minimization & Sanitization', desc: 'Sharing only necessary data and scrubbing metadata from shared documents.' },
      { title: 'Cookie & Tracking Prevention', desc: 'Managing third-party tracking cookies, fingerprinting, and telemetry permissions.' },
    ],
  },
  'Safe Browsing & Downloads': {
    category: 'Safe Browsing & Downloads',
    summary: 'Hardening browser environments, verifying file integrity, and avoiding web-based threats.',
    skills: [
      { title: 'Extension & Plugin Vetting', desc: 'Auditing browser add-on permissions to prevent malicious data harvesting.' },
      { title: 'File Checksum Verification', desc: 'Validating SHA-256 and MD5 cryptographic hashes before launching executables.' },
      { title: 'HTTPS & HSTS Enforcement', desc: 'Ensuring strict transport security and recognizing mixed content warnings.' },
      { title: 'Sandboxed Download Environments', desc: 'Testing untrusted files in isolated containers before host execution.' },
    ],
  },
  'Mobile & Device Security': {
    category: 'Mobile & Device Security',
    summary: 'Comprehensive protection for smartphones, tablets, biometric locks, and mobile OS permissions.',
    skills: [
      { title: 'Biometric & Secure Enclave Protection', desc: 'Utilizing hardware-backed fingerprint and facial recognition keys.' },
      { title: 'App Sandboxing & Permission Audits', desc: 'Restricting background location, microphone, and camera access on apps.' },
      { title: 'Remote Wipe & Anti-Loss Config', desc: 'Configuring remote tracking and emergency cryptographic wipe capabilities.' },
      { title: 'Sideloading & Jailbreak Defense', desc: 'Avoiding unauthorized app repositories and compromised system firmware.' },
    ],
  },
  'Cloud Security & Storage': {
    category: 'Cloud Security & Storage',
    summary: 'Configuring secure cloud buckets, IAM access control, and client-side encryption.',
    skills: [
      { title: 'Shared Responsibility Model', desc: 'Distinguishing provider infrastructure safety from user configuration duties.' },
      { title: 'Cloud Bucket ACL Auditing', desc: 'Preventing public data exposure on cloud storage and database endpoints.' },
      { title: 'Client-Side Data Encryption', desc: 'Encrypting sensitive files locally before uploading to cloud providers.' },
      { title: 'API Key & Token Management', desc: 'Securing cloud access credentials and enforcing least-privilege policies.' },
    ],
  },
  'Social Media Safety': {
    category: 'Social Media Safety',
    summary: 'Preventing OSINT exposure, account takeover, and social engineering in online networks.',
    skills: [
      { title: 'Oversharing & OSINT Defense', desc: 'Preventing personal data exposure used by attackers for security question resets.' },
      { title: 'Account Takeover Protection', desc: 'Setting up login alerts, trusted device whitelisting, and session revoking.' },
      { title: 'Bot & Impersonator Screening', desc: 'Identifying fake profile clones, engagement farming, and malicious direct messages.' },
      { title: 'Geolocation & Metadata Stripping', desc: 'Preventing real-time physical location disclosure through shared photos.' },
    ],
  },
  'Identity Theft & Fraud': {
    category: 'Identity Theft & Fraud',
    summary: 'Detecting synthetic identity creation, credit fraud, and document compromise.',
    skills: [
      { title: 'Credit & Identity Monitoring', desc: 'Reviewing credit bureau reports and setting up fraud alerts.' },
      { title: 'Document Redaction Best Practices', desc: 'Masking national identity numbers (Aadhaar, SSN, Passport) before sharing.' },
      { title: 'Synthetic Identity Theft Defense', desc: 'Spotting fabricated credit profiles and unauthorized account openings.' },
      { title: 'Impersonation Recovery Protocols', desc: 'Filing institutional disputes and locking compromised financial credentials.' },
    ],
  },
  'Incident Response & Reporting': {
    category: 'Incident Response & Reporting',
    summary: 'Immediate triage, forensic preservation, and institutional escalation protocols.',
    skills: [
      { title: 'First-Response Containment', desc: 'Isolating affected systems immediately to stop lateral breach movement.' },
      { title: 'Forensic Evidence Preservation', desc: 'Documenting logs, timestamps, and screenshots without altering system states.' },
      { title: 'National Cyber Crime Reporting', desc: 'Escalating cyber offences via helpline 1930 and official cybercrime portals.' },
      { title: 'Post-Incident Root Cause Analysis', desc: 'Conducting post-mortems to remediate security gaps and reinforce defenses.' },
    ],
  },
  'Email Security & Protocols': {
    category: 'Email Security & Protocols',
    summary: 'Understanding email authentication headers, avoiding BEC scams, and encrypting mail.',
    skills: [
      { title: 'SPF, DKIM, and DMARC Verification', desc: 'Inspecting email authentication records to confirm sender validity.' },
      { title: 'Business Email Compromise (BEC) Defense', desc: 'Spotting executive impersonation and wire transfer fraud requests.' },
      { title: 'Encrypted Mail Transmission', desc: 'Applying S/MIME and PGP end-to-end cryptographic email security.' },
      { title: 'Attachment Sandboxing', desc: 'Neutralizing suspicious archives and macro-embedded office documents.' },
    ],
  },
  'Encryption & Cryptography': {
    category: 'Encryption & Cryptography',
    summary: 'Applying symmetric/asymmetric algorithms, digital signatures, and public key infrastructure.',
    skills: [
      { title: 'Symmetric vs Asymmetric Ciphers', desc: 'Applying AES-256 for data at rest and RSA/ECC for key exchanges.' },
      { title: 'Public Key Infrastructure (PKI)', desc: 'Understanding digital certificates, Certificate Authorities, and trust chains.' },
      { title: 'Cryptographic Hashing (SHA-256/3)', desc: 'Ensuring message integrity and identifying hash collisions.' },
      { title: 'Key Lifecycle & Storage Safety', desc: 'Protecting private keys with hardware security modules (HSMs) and keystores.' },
    ],
  },
  'IoT & Smart Devices': {
    category: 'IoT & Smart Devices',
    summary: 'Hardening smart home appliances, IoT gateways, and embedded firmware security.',
    skills: [
      { title: 'Default Credential Overhaul', desc: 'Replacing factory-default passwords on routers, cameras, and IoT gateways.' },
      { title: 'VLAN & Guest Network Isolation', desc: 'Segmenting IoT appliances onto dedicated subnets away from personal computers.' },
      { title: 'Firmware Update Cadence', desc: 'Applying vendor security patches to eliminate known embedded vulnerabilities.' },
      { title: 'Hardware Privacy Controls', desc: 'Using physical lens covers and disabling unneeded microphones/sensors.' },
    ],
  },
  'AI & Emerging Threats': {
    category: 'AI & Emerging Threats',
    summary: 'Combatting deepfake deception, AI prompt injection, and automated synthetic attacks.',
    skills: [
      { title: 'Deepfake Audio & Video Detection', desc: 'Identifying facial artifact glitches, voice cloning anomalies, and sync errors.' },
      { title: 'LLM Data Sanitization', desc: 'Preventing proprietary code and confidential data leakage into public AI models.' },
      { title: 'AI Prompt Injection Defense', desc: 'Understanding jailbreak mechanisms and adversarial inputs against AI systems.' },
      { title: 'Automated Polymorphic Phishing Defense', desc: 'Recognizing hyper-personalized AI-generated spear-phishing content.' },
    ],
  },
  'Physical Security & Hygiene': {
    category: 'Physical Security & Hygiene',
    summary: 'Enforcing clean desk principles, hardware tamper prevention, and perimeter awareness.',
    skills: [
      { title: 'Clean Desk & Screen Lock Routine', desc: 'Enforcing instant workstation locking (Win+L / Cmd+Ctrl+Q) when stepping away.' },
      { title: 'Tailgating & Perimeter Defense', desc: 'Preventing unauthorized physical entry and badge pass-backs in secure areas.' },
      { title: 'Shoulder Surfing Prevention', desc: 'Using polarized privacy filters and situational awareness in public environments.' },
      { title: 'Drop Attack (BadUSB) Defense', desc: 'Refusing unknown USB flash drives and utilizing USB data blockers.' },
    ],
  },
  'Online Gaming & Metaverse': {
    category: 'Online Gaming & Metaverse',
    summary: 'Protecting gaming credentials, in-game economies, modding safety, and voice anonymity.',
    skills: [
      { title: 'Trade Scam & Phishing Defense', desc: 'Spotting fake item trade links and credential phishing in gaming communities.' },
      { title: 'Mod & Trainer Malware Screening', desc: 'Scanning third-party game modifications for bundled spyware and trojans.' },
      { title: 'Voice Chat Privacy Protection', desc: 'Preventing personal location, age, and identity leaks during live multiplayer.' },
      { title: 'Virtual Economy Account Security', desc: 'Securing digital asset accounts with specialized authenticator protections.' },
    ],
  },
  'Financial Fraud & UPI Safety': {
    category: 'Financial Fraud & UPI Safety',
    summary: 'Safe digital banking, UPI transaction rules, SIM swap defense, and dispute resolution.',
    skills: [
      { title: 'UPI PIN Transaction Rules', desc: 'Remembering that UPI PIN is strictly for SENDING money, never for receiving.' },
      { title: 'SIM Swap & OTP Protection', desc: 'Spotting cellular network deactivations and preventing OTP theft.' },
      { title: 'Search Ad & Fake Helpline Scams', desc: 'Verifying official bank helpline numbers and avoiding deceptive search ads.' },
      { title: 'Banking Chargeback & Dispute Filing', desc: 'Taking immediate action to freeze accounts and file fraudulent transaction disputes.' },
    ],
  },
  'Workplace & Remote Security': {
    category: 'Workplace & Remote Security',
    summary: 'Zero Trust architecture, enterprise VPN protocols, shadow IT, and data governance.',
    skills: [
      { title: 'Zero Trust & Enterprise VPN Access', desc: 'Validating device health and identity before granting institutional access.' },
      { title: 'Shadow IT & Unauthorized SaaS Audits', desc: 'Using approved enterprise software tools to protect institutional data.' },
      { title: 'Confidential Document Handling', desc: 'Applying classification watermarks and access permissions on work assets.' },
      { title: 'Institutional Escalation Channels', desc: 'Reporting workplace security incidents through designated IT security paths.' },
    ],
  },
  'Digital Footprint & Reputation': {
    category: 'Digital Footprint & Reputation',
    summary: 'Auditing personal exposure, data broker opt-outs, and long-term cyber brand hygiene.',
    skills: [
      { title: 'Search Engine Exposure Audits', desc: 'Conducting self-doxxing audits and removing indexed personal records.' },
      { title: 'Data Broker Opt-Out Execution', desc: 'Submitting removal requests to people-search engines and data aggregators.' },
      { title: 'Reverse Image & Profile Scrubbing', desc: 'Tracking and removing unauthorized profile photo usage across web portals.' },
      { title: 'Long-Term Digital Brand Hygiene', desc: 'Maintaining clean, professional, and secure public digital footprints.' },
    ],
  },
};

export function getTopicSkillInfo(topicCategory: string): TopicSkillDetail {
  return TOPIC_SKILLS_MAP[topicCategory] || {
    category: topicCategory,
    summary: `Comprehensive knowledge and practical competencies in ${topicCategory}.`,
    skills: [
      { title: 'Foundational Knowledge', desc: `Understanding core principles and risk vectors in ${topicCategory}.` },
      { title: 'Threat Identification', desc: `Recognizing common exploitation tactics and vulnerabilities in ${topicCategory}.` },
      { title: 'Defensive Best Practices', desc: `Implementing proactive security hygiene and defensive measures.` },
      { title: 'Incident Response & Mitigation', desc: `Taking corrective action and reporting threats effectively.` },
    ],
  };
}
