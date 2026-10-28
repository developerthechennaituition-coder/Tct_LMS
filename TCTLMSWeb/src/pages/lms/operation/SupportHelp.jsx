import React, { useCallback, useEffect, useState } from "react";
import { Link, useHistory } from "react-router-dom";
import { Spinner } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { BlockHead, BlockHeadContent, BlockTitle, Icon } from "../../../components/Component";
import { GetMenuByUser } from "../../../apiservices/AuthenticateService";
import { GetHelpContacts } from "../../../apiservices/ChatService";
import "./SupportHelp.css";

const HELP_LINK = "/lms/operation/help";
const CHAT_PATH = `${process.env.PUBLIC_URL}/app-chat`;

// WhatsApp support lines in the Contact card. They are not TCT members (not linked to any user):
// clicking one opens WhatsApp click-to-chat in a new tab, and the user writes and sends any message.
const WHATSAPP_SUPPORT = [
  { name: "TCT Support", label: "WhatsApp Support", phone: "6383413616" },
  { name: "TCT Support 2", label: "WhatsApp Support", phone: "6383413616" },
  { name: "TCT Support 3", label: "WhatsApp Support", phone: "6383413616" },
];
// wa.me needs the international number as digits only; a 10-digit (Indian) number gets the 91 code.
const whatsAppUrl = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

const roleLabel = (role) => String(role || "").replace(/([a-z])([A-Z])/g, "$1 $2");
const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

// Support → Help is granted per role in Settings → Role Permission (menu link /lms/operation/help).
// Read fresh from the menu API on every visit, so a typed URL cannot bypass a revoked permission.
const useHelpPermission = () => {
  const [state, setState] = useState({ loading: true, allowed: false });
  useEffect(() => {
    let active = true;
    const roleId = localStorage.getItem("roleId");
    if (!roleId) {
      setState({ loading: false, allowed: false });
      return undefined;
    }
    const hasHelp = (items) =>
      (Array.isArray(items) ? items : []).some(
        (item) => (item?.link || "").trim().toLowerCase().replace(/\/+$/, "") === HELP_LINK || hasHelp(item?.subMenu)
      );
    GetMenuByUser(roleId)
      .then((menu) => active && setState({ loading: false, allowed: hasHelp(Array.isArray(menu) ? menu : menu?.data) }))
      .catch(() => active && setState({ loading: false, allowed: false }));
    return () => {
      active = false;
    };
  }, []);
  return state;
};

const EmptyNote = ({ icon, children }) => (
  <div className="sh-empty">
    <Icon name={icon} />
    <p>{children}</p>
  </div>
);

const SupportHelp = () => {
  const history = useHistory();
  const permission = useHelpPermission();
  const [contacts, setContacts] = useState([]);
  const [contactState, setContactState] = useState({ loading: true, error: false });

  // TCT members responsible for the logged-in user (identified by the server from the access token).
  const loadContacts = useCallback(() => {
    setContactState({ loading: true, error: false });
    GetHelpContacts()
      .then((response) => {
        const list = Array.isArray(response) ? response : response?.data || [];
        setContacts(list.filter((c, i, all) => c?.id && all.findIndex((x) => x.id === c.id) === i));
        setContactState({ loading: false, error: false });
      })
      .catch(() => {
        setContacts([]);
        setContactState({ loading: false, error: true });
      });
  }, []);

  useEffect(() => {
    if (permission.allowed) loadContacts();
  }, [permission.allowed, loadContacts]);

  // Same 1:1 conversation as clicking the contact in Chat → TCT Help.
  const openChatWith = (contact) => history.push(CHAT_PATH, { helpContact: { id: contact.id, name: contact.name } });

  const withEmail = contacts.filter((c) => (c.email || "").trim());

  const contactBody = contactState.loading ? (
    <div className="sh-state" role="status"><Spinner size="sm" color="primary" /> Loading your TCT contacts…</div>
  ) : contactState.error ? (
    <div className="sh-state is-error" role="alert">
      <Icon name="alert-circle" /> Unable to load your TCT contacts.
      <button type="button" className="btn btn-sm btn-light" onClick={loadContacts}>Retry</button>
    </div>
  ) : null;

  return (
    <React.Fragment>
      <Head title="Help" />
      <Content>
        <div className="tct-support-help">
          <BlockHead size="sm">
            <BlockHeadContent>
              <BlockTitle page tag="h3">Help</BlockTitle>
              <p className="sh-sub">Reach the TCT team responsible for you — by chat or by email.</p>
            </BlockHeadContent>
          </BlockHead>

          {permission.loading ? (
            <div className="sh-state" role="status"><Spinner color="primary" /> Checking access…</div>
          ) : !permission.allowed ? (
            <div className="sh-locked">
              <Icon name="lock-alt" />
              <p>You do not have permission to view Help. A Super Admin can grant it in Settings → Role Permission → Support.</p>
            </div>
          ) : (
            <div className="sh-grid">
              {/* Contact */}
              <section className="sh-card sh-tone-contact" aria-labelledby="sh-contact-title">
                <div className="sh-card-head">
                  <span className="sh-chip" aria-hidden="true"><Icon name="users" /></span>
                  <div>
                    <h5 id="sh-contact-title" className="sh-card-title">Contact</h5>
                    <p className="sh-card-desc">Reach TCT Support on WhatsApp.</p>
                  </div>
                </div>
                <ul className="sh-people sh-support">
                  {WHATSAPP_SUPPORT.map((line) => (
                    <li key={line.name}>
                      <a className="sh-person" href={whatsAppUrl(line.phone)} target="_blank" rel="noopener noreferrer"
                        aria-label={`${line.name} on WhatsApp (opens in a new tab)`}>
                        <span className="sh-avatar is-whatsapp" aria-hidden="true"><Icon name="whatsapp" /></span>
                        <span className="sh-person-text">
                          <span className="sh-person-name">{line.name}</span>
                          <span className="sh-person-role">{line.label}</span>
                        </span>
                        <Icon name="external" className="sh-person-cta" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Chat: your TCT team (from help-contacts); a person opens their conversation in TCT LMS Chat. */}
              <section className="sh-card sh-tone-chat" aria-labelledby="sh-chat-title">
                <div className="sh-card-head">
                  <span className="sh-chip" aria-hidden="true"><Icon name="chat-circle" /></span>
                  <div>
                    <h5 id="sh-chat-title" className="sh-card-title">Chat</h5>
                    <p className="sh-card-desc">Your TCT team. Select a person to open your conversation in TCT LMS Chat.</p>
                  </div>
                </div>
                <div className="sh-card-fill sh-team">
                  {contactBody || (contacts.length === 0 ? (
                    <EmptyNote icon="user-cross">No TCT contact is assigned to you at the moment.</EmptyNote>
                  ) : (
                    <ul className="sh-people">
                      {contacts.map((contact) => (
                        <li key={contact.id}>
                          <button type="button" className="sh-person" onClick={() => openChatWith(contact)}
                            aria-label={`Chat with ${contact.name}, ${roleLabel(contact.role)}`}>
                            <span className="sh-avatar" aria-hidden="true">{initials(contact.name)}</span>
                            <span className="sh-person-text">
                              <span className="sh-person-name">{contact.name}</span>
                              <span className="sh-person-role">{roleLabel(contact.role) || "TCT team"}</span>
                            </span>
                            <Icon name="chat-circle" className="sh-person-cta" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ))}
                </div>
                <Link to={CHAT_PATH} className="btn sh-action">
                  <Icon name="chat-circle" /> <span>Open Chat</span>
                </Link>
              </section>

              {/* Mail */}
              <section className="sh-card sh-tone-mail" aria-labelledby="sh-mail-title">
                <div className="sh-card-head">
                  <span className="sh-chip" aria-hidden="true"><Icon name="mail" /></span>
                  <div>
                    <h5 id="sh-mail-title" className="sh-card-title">Mail</h5>
                    <p className="sh-card-desc">Email your TCT team from your own mail app.</p>
                  </div>
                </div>
                {contactBody || (withEmail.length === 0 ? (
                  <EmptyNote icon="mail">No email address is available for your TCT contacts.</EmptyNote>
                ) : (
                  <ul className="sh-people">
                    {withEmail.map((contact) => (
                      <li key={contact.id}>
                        <a className="sh-person" href={`mailto:${contact.email.trim()}`}
                          aria-label={`Email ${contact.name}, ${roleLabel(contact.role)}, at ${contact.email.trim()}`}>
                          <span className="sh-avatar" aria-hidden="true">{initials(contact.name)}</span>
                          <span className="sh-person-text">
                            <span className="sh-person-name">{contact.name}</span>
                            <span className="sh-person-role sh-email">{contact.email.trim()}</span>
                          </span>
                          <Icon name="send" className="sh-person-cta" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ))}
              </section>
            </div>
          )}
        </div>
      </Content>
    </React.Fragment>
  );
};

export default SupportHelp;
