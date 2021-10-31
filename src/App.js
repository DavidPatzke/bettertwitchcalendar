
import './App.css';
import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './components/Calendar.jsx'
import { Col, Container, Row, Navbar, Modal, Button, Nav, Image, Dropdown, Form, Card } from 'react-bootstrap';
import { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import Calendar from './components/Calendar.jsx';
import chroma from 'chroma-js';
import CookieConsent from "react-cookie-consent";
import logo from './images/logo.png'
import AsyncSelect from 'react-select/async';
import { FcGoogle } from 'react-icons/fc'
import { SiTwitch } from 'react-icons/si'
import { GoPrimitiveDot } from 'react-icons/go'



const followsLimit = 20;
const ClientId = 'dmwrtau020osfgxpvvvez8bktyk9bj';
const scopes = 'channel:manage:schedule';
const googleScopes = 'https://www.googleapis.com/auth/calendar';
const googleClientId = '13169732733-n1plj26i6b11lft8m3dq3p4pc30uloja.apps.googleusercontent.com';

const redirectUriGoogle = `${window.location.protocol}//${window.location.host}`;
const redirectUriTwitch = `${window.location.protocol}//${window.location.host}`;
const url = `https://id.twitch.tv/oauth2/authorize?client_id=${ClientId}&redirect_uri=${redirectUriTwitch}&response_type=token&scope=${scopes}`


function App() {


  const location = new URL(window.location);
  const oAuth2Data = location.hash.replace('#', '').split('&').map(e => e.split('=')).reduce((a, c) => ({ ...a, [c[0]]: c[1] }), {})
  const searchParams = window.location.searchParams
  const [access_token, setAccesToken] = useState(oAuth2Data?.access_token);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);
  const [metaData, setMetaData] = useState([])
  const [events, setEvents] = useState([]);
  const [show, setShow] = useState(false);
  const formData = useRef(null);
  const categorySel = useRef(null);
  const [calendarOptions, setCalendarOptions] = useState([])
  const [scriptLoading, setScriptLoading] = useState(true)
  const [calendarApiLoaded, setCalendarApiLoaded] = useState(false)
  const googleCalendarSelect = useRef(null)
  const [showImpressum, setShowImpressum] = useState();
  const [ownSchedule, setOwnSchedule] = useState([]);

  let colors = chroma.scale(['#fafa6e', '#2A4858'])
    .mode('lch').colors(100)[Symbol.iterator];

  useEffect(() => {

    const script = document.createElement('script');

    script.src = "https://apis.google.com/js/api.js";
    script.setAttribute('data-loading', true);
    script.addEventListener('load', () => { setScriptLoading(false) })
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    }
  });
  const googleLoginButtonClick = () => {
    const GoogleAuth = window.gapi.auth2.getAuthInstance();


    GoogleAuth.isSignedIn.listen(handleGoogleLogin);
    GoogleAuth.signIn();
    const user = GoogleAuth.currentUser.get();
    if (user) {
      setGoogleUser(user)
    }
  }
  const handleGoogleLogin = (data) => {
    const GoogleAuth = window.gapi.auth2.getAuthInstance();
    const user = GoogleAuth.currentUser.get();
    if (data) {
      setGoogleUser(user);
    } else {
      setGoogleUser(null);
    }

  }

  useEffect(() => {
    if (googleUser && calendarApiLoaded) {
      fetchGoogleCalendars();
    }
  }, [googleUser, calendarApiLoaded])

  const fetchGoogleCalendars = () => {
    const request = window.gapi.client.request({
      'method': 'GET',
      'path': '/calendar/v3/users/me/calendarList',
      'params': {}
    });
    // Execute the API request.
    request.execute(function (response) {
      const calendars = [];
      response.items.forEach((calendar) => {
        if (calendar.accessRole === 'owner') {
          calendars.push({ value: calendar.etag, label: calendar.summary })
        }
      });
      setCalendarOptions(calendars)
    });
  }

  useEffect(() => {

    const gapiInit = () => {

      window.gapi.auth2.init({
        apiKey: 'AIzaSyBS4ox_PupkYgv4QAeA6bBjkLUJi7GU7P8',
        clientId: '13169732733-n1plj26i6b11lft8m3dq3p4pc30uloja.apps.googleusercontent.com',
        discoveryDocs: 'https://calendar-json.googleapis.com/$discovery/rest?version=v3',
        scope: googleScopes
      });
      window.gapi.client.load('calendar', 'V3', () => { setCalendarApiLoaded(true) });



    }

    if (!scriptLoading) {
      window.gapi.load('client', gapiInit);



    }

  }, [scriptLoading])


  useEffect(() => {
    const fetchUserData = async (access_token) => {
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${access_token}`)
      headers.append('Client-Id', ClientId)

      fetch('https://api.twitch.tv/helix/users', { headers, }).then((res) => res.json()).then((jsonData) => { setUser(jsonData.data[0]); setIsLoading(false); });

    }




    if (access_token) {

      setIsLoading(true)
      oAuth2Data.created = new Date();
      localStorage.setItem('twitch', JSON.stringify(oAuth2Data));
      fetchUserData(access_token);


    }

  }, [access_token]);

  useEffect(() => {

    const fetchFollows = async (pageId = '', pageCount = 1) => {
      const headers = new Headers();
      //headers.append('Accept', 'application/vnd.twitchtv.v5+json')
      headers.append('Authorization', `Bearer ${access_token}`)
      headers.append('Client-Id', ClientId)
      const cursor = pageId ? `&after=${pageId}` : '';


      fetch(`https://api.twitch.tv/helix/users/follows?from_id=${user.id}&first=20&${cursor}`, { headers })
        .then((res) => res.json())
        .then(async (jsonData) => {

          const follows = jsonData.data.map((e) => ({ value: e.to_id, label: e.to_name }))
          setMetaData(prevState => [...prevState, ...follows]);
          if (pageCount * followsLimit < jsonData.total) {
            await fetchFollows(jsonData.pagination.cursor, pageCount + 1)
          }

          setIsLoading(false);

        });
    }
    if (user) {
      setIsLoading(true)
      fetchFollows();
      fetchSchedule(user.id).then((schedule) => {
        setOwnSchedule(schedule?.data?.segments || []);
      })

    }

  }, [user]);




  const handleSelectChange = async (selectedValues, action) => {

    if (action.action === 'select-option') {
      const schedule = await fetchSchedule(action.option.value);

      if (!schedule.error) {
        const tempEvents = [];

        schedule.data.segments?.forEach((eventData) => {
          const eventDate = new Date(eventData.start_time);

          const event = {
            title: eventData.title,
            date: eventDate,
            time: eventDate.toLocaleTimeString(),
            streamer: schedule.data.broadcaster_name,
            streamerId: schedule.data.broadcaster_id
          }
          tempEvents.push(event)

        });
        setEvents(prevEvents => [...prevEvents, ...tempEvents])
      }

    }
    if (action.action === 'remove-value') {
      const filteredEvents = events.filter((event) => {
        return action.removedValue.value !== event.streamerId
      })
      setEvents(filteredEvents)
    }

  }





  const fetchSchedule = async (broadcasterId) => {
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${access_token}`)
    headers.append('Client-Id', ClientId);
    return fetch(`https://api.twitch.tv/helix/schedule?broadcaster_id=${broadcasterId}`, { headers }).then(async (res) => await res.json());

  }

  const handleClose = () => {
    setShow(false)
  }
  const closeImpressum = () => {
    setShowImpressum(false)
  }
  const fetchTwitchWithAUth = (url, options) => {
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${access_token}`)
    headers.append('Client-Id', ClientId);
    return fetch(url, { headers, ...options })
  }

  const loadCategories = (query) => {

    return fetchTwitchWithAUth(`https://api.twitch.tv/helix/search/categories?query=${query}`, {}).then(response => response.json()).then(json => {
      return json?.data.map((e) => {
        return { label: e.name, value: e.id }
      })
    })
  }

  const saveEvent = (event) => {
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${access_token}`)
    headers.append('Client-Id', ClientId);
    headers.append('Content-Type', 'application/json')
    const jsonBody = {};
    const data = new FormData(formData.current);
    const date = data.get('date');
    const time = data.get('time');
    data.set('is_recurring', true)
    data.delete('time');
    data.delete('date');

    data.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
    data.append('category_id', categorySel.current.select.getProp('value').value)
    data.append('start_time', new Date(`${date}:${time}`).toISOString());
    data.forEach(function (value, key) {
      jsonBody[key] = value;
    });
    var body = JSON.stringify(jsonBody);

    if (data.get('postGoogle') === 'on') {
      const startDate = new Date(`${date}:${time}`);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours(), startDate.getMinutes() + Number(data.get('duration')))
      const request = window.gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': createEventFromDate(startDate, endDate, data.get('title'), '', '')
      });
      request.execute((event) => {
        console.log(event)
      })
    }

    //const response = fetch(`https://api.twitch.tv/helix/schedule/segment?broadcaster_id=${user.id}`, { method: 'POST', headers, body }).then(async (res) => await res.json());
  }

  return (

    <div className="">

      <Navbar className='px-3 brandBg' variant="dark">

        <Navbar.Brand >
          <img
            src={logo}
            width="100"
            height="auto"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
            className="d-inline-block align-top "
            alt="Better Twich Calendar Logo"
          />{' '}
        </Navbar.Brand>
        <Navbar.Brand href="#home">Better Twitch Calendar</Navbar.Brand>

        <Container className='justify-content-end'>


          {user
            ? <><div className="d-flex align-items-center">
              <div className="flex-shrink-0">
                <span className='fw-bold text-light'><GoPrimitiveDot style={{ visibility: 'none' }} /> Hello,  {user.display_name}</span> <br />
                {googleUser && <span className='fw-bold text-light'><GoPrimitiveDot style={{ color: 'green' }} /> Conncted with Google</span>}
              </div>
              <div className="flex-grow-1 ms-3">
                <Image width='50px' height='50px' src={user.profile_image_url} rounded />

              </div>
            </div> </>




            : <a href={url}><Button style={{ 'backgroundColor': '#6441a5' }} ><SiTwitch /> Connect  Twitch</Button></a>}
          {!googleUser &&
            <>  <Button className='mx-2' onClick={googleLoginButtonClick} style={{ 'backgroundColor': 'black' }} ><FcGoogle /> Connect Google Calendar</Button></>}








        </Container>
      </Navbar>
      <Container className='py-3'>
        <Row>
          <Col>
            <Card style={{ marginBottom: '50px' }} ><Card.Body style={{ minHeight: '870px' }}>    {user
              ? <><Select
                options={metaData}
                isMulti
                onChange={handleSelectChange}
              >

              </Select>   <Calendar startDate={new Date()} events={events} ownSchedule={ownSchedule} /><div className='py-3'>
                  <Button onClick={() => { setShow(!show) }}>Create new Stream date </Button></div>
                <Modal show={show} onHide={handleClose}>
                  <Modal.Header closeButton>
                    <Modal.Title>Create Stream date</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <Form ref={formData}>
                      <Form.Group className="mb-3" controlId="formBasicEmail">
                        <Form.Label>Title</Form.Label>
                        <Form.Control maxLength='140' type="Title" name='title' placeholder="Tell your viewers what they're in for" />

                      </Form.Group>

                      <Form.Group className="mb-3" controlId="formBasicCheckbox">
                        <Form.Check type="checkbox" name='is_recurring' label="Recuring" />
                      </Form.Group>
                      <Form.Group className="mb-3" controlId="formBasicCheckbox">
                        <Form.Label>When?</Form.Label>
                        <input className='form-control' type="date" id="start" name="date" />
                      </Form.Group>
                      <Form.Group>
                        <Form.Label>Duration</Form.Label>
                        <input className='form-control' type="number" id="duration" name="duration" />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Time?</Form.Label>
                        <input className='form-control' type="time" min="1" name="time" required />

                      </Form.Group>
                      <Form.Group className="mb-3" controlId="">
                        <Form.Label>Categorie</Form.Label>
                        <AsyncSelect
                          ref={categorySel}

                          loadOptions={loadCategories}>

                        </AsyncSelect>
                        {googleUser && <>
                          <Form.Group className="mb-3" controlId="postGoogle">
                            <Form.Check ref={googleCalendarSelect} type="checkbox" name='postGoogle' label="Post to Google" />
                          </Form.Group>
                          <Select

                            options={calendarOptions}>

                          </Select>
                        </>
                        }
                      </Form.Group>


                    </Form>


                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      Close
                    </Button>
                    <Button variant="primary" onClick={saveEvent}>
                      Save
                    </Button>
                  </Modal.Footer>
                </Modal>

              </>
              : 'Welcome to the Better Twitch Calendar. Just login in with Twitch, select your favorite streamer from the dropdown and use this app as a good old TV paper.'}</Card.Body></Card>

          </Col>
        </Row>


        <footer bg='dark' className="footer justify-content-center" >
          <Container> <span className='link-button' onClick={() => { setShowImpressum(true) }} >Impressum </span></Container>
          <Modal className='fullscreenn' show={showImpressum} onHide={closeImpressum}>
            <Modal.Header closeButton>
              <Modal.Title>Impressum</Modal.Title>
            </Modal.Header>
            <Modal.Body>

              <p>Mats David Vincent Patzke<br />
                Eltviller Straße 17<br />
                53175 Bonn<br />

                <a href="mailto:bettertwitchcalendar@gmail.com">bettertwitchcalendar@gmail.com</a>
              </p>
              <meta name="generator" content="Impressum-Generator der Kanzlei Hensche Rechtsanwälte" />
              <p>&nbsp;</p>
              <h1>Disclaimer - rechtliche Hinweise</h1>
              <p><strong>Auskunfts- und Widerrufsrecht</strong></p>
              <p>Sie haben jederzeit das Recht, sich unentgeltlich und unverzüglich über die zu Ihrer Person erhobenen Daten
                zu erkundigen. Ebenfalls können Sie Ihre Zustimmung zur Verwendung Ihrer angegebenen persönlichen Daten mit
                Wirkung für die Zukunft widerrufen. Hierfür wenden Sie sich bitte an den im Impressum angegebenen
                Diensteanbieter.</p>
              <p><strong>Datenschutz (allgemein)</strong></p>
              <p>Beim Zugriff auf unsere Webseite werden automatisch allgemeine Informationen (sog. Server-Logfiles) erfasst. Diese
                beinhalten u.a. den von Ihnen verwendeten Webbrowser sowie Ihr Betriebssystem und Ihren Internet Service Provider. Diese
                Daten lassen keinerlei Rückschlüsse auf Ihre Person zu und werden von uns statistisch ausgewertet, um unseren
                Internetauftritt technisch und inhaltlich zu verbessern. Das Erfassen dieser Informationen ist notwendig, um den Inhalt
                der Webseite korrekt ausliefern zu können.</p>
              <p>Die Nutzung der Webseite ist grundsätzlich ohne Angabe personenbezogener Daten möglich. Soweit
                personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) erhoben werden, erfolgt dies, soweit
                möglich, stets auf freiwilliger Basis. Diese Daten werden ohne Ihre ausdrückliche Zustimmung nicht an Dritte
                weitergegeben.</p>
              <p>Sofern ein Vertragsverhältnis begründet, inhaltlich ausgestaltet oder geändert werden soll oder Sie an
                uns eine Anfrage stellen, erheben und verwenden wir personenbezogene Daten von Ihnen, soweit dies zu diesem Zwecke
                erforderlich ist (Bestandsdaten). Wir erheben, verarbeiten und nutzen personenbezogene Daten soweit dies erforderlich
                ist, um Ihnen die Inanspruchnahme des Webangebots zu ermöglichen (Nutzungsdaten). Sämtliche personenbezogenen
                Daten werden nur solange gespeichert wie dies für den genannten Zweck (Bearbeitung Ihrer Anfrage oder Abwicklung
                eines Vertrags) erforderlich ist. Hierbei werden steuer- und handelsrechtliche Aufbewahrungsfristen von uns
                berücksichtigt. Auf Anordnung der zuständigen Stellen müssen wir im Einzelfall Auskunft über diese
                Daten (Bestandsdaten) erteilen, soweit dies für Zwecke der Strafverfolgung, zur Gefahrenabwehr, zur Erfüllung
                der gesetzlichen Aufgaben der Verfassungsschutzbehörden oder des Militärischen Abschirmdienstes oder zur
                Durchsetzung der Rechte am geistigen Eigentum erforderlich ist.</p>
              <p>Wir weisen ausdrücklich darauf hin, dass die Datenübertragung im Internet (z. B. bei der Kommunikation per
                E-Mail) Sicherheitslücken aufweisen kann. Vor dem Zugriff auf Daten kann nicht lückenlos geschützt
                werden.</p>
              <p>Die Nutzung von im Rahmen der Impressumspflicht veröffentlichten Kontaktdaten durch Dritte zur Übersendung
                von nicht ausdrücklich angeforderter Werbung und Informationsmaterialien wird hiermit ausdrücklich untersagt.
                Ausgenommen hiervon sind bestehende Geschäftsbeziehungen bzw. es liegt Ihnen eine entsprechende Einwilligung von uns
                vor.</p>
              <p>Die Anbieter und alle auf dieser Website genannten Dritten behalten sich ausdrücklich rechtliche Schritte im
                Falle der unverlangten Zusendung von Werbeinformationen vor. Gleiches gilt für die kommerzielle Verwendung und
                Weitergabe der Daten.</p>
              <p><strong>Google Analytics</strong></p>
              <p>Diese Website benutzt Google Analytics, einen Webanalysedienst der Google Inc. (&quot;Google&quot;), 1600 Amphitheatre Parkway,
                Mountain View, CA 94043, USA. Google Analytics verwendet sog. &quot;Cookies&quot; (Textdateien), die auf Ihrem Computer gespeichert
                werden und die eine Analyse der Benutzung der Website durch Sie ermöglichen. Die durch das Cookie erzeugten
                Informationen über Ihre Benutzung dieser Website werden in der Regel an einen Server von Google in den USA
                übertragen und dort gespeichert. Im Falle der Aktivierung der IP-Anonymisierung auf dieser Website, wird Ihre
                IP-Adresse von Google jedoch innerhalb von Mitgliedstaaten der Europäischen Union oder in anderen Vertragsstaaten
                des Abkommens über den Europäischen Wirtschaftsraum zuvor gekürzt. Nur in Ausnahmefällen wird die
                vollständige IP-Adresse an einen Server von Google in den USA übertragen und dort anonymisiert. Im Auftrag des
                Betreibers dieser Website wird Google diese Informationen benutzen, um Ihre Nutzung der Website auszuwerten, um Reports
                über die Websiteaktivitäten zusammenzustellen und um weitere mit der Websitenutzung und der Internetnutzung
                verbundene Dienstleistungen gegenüber dem Websitebetreiber zu erbringen. Die im Rahmen von Google Analytics von
                Ihrem Browser übermittelte IP-Adresse wird nicht mit anderen Daten von Google zusammengeführt.</p>
              <p>Sie können die Speicherung der Cookies durch eine entsprechende Einstellung Ihrer Browser-Software verhindern;
                wir weisen Sie jedoch darauf hin, dass Sie in diesem Fall gegebenenfalls nicht sämtliche Funktionen dieser Website
                vollumfänglich nutzen können. Sie können darüber hinaus die Erfassung der durch das Cookie erzeugten
                und auf Ihre Nutzung der Website bezogenen Daten (inkl. Ihrer IP-Adresse) an Google sowie die Verarbeitung dieser Daten
                durch Google verhindern, indem sie das unter dem folgenden Link verfügbare Browser-Add-on herunterladen und
                installieren: <a target="_blank" rel="noreferrer"
                  href="http://tools.google.com/dlpage/gaoptout?hl=de">http://tools.google.com/dlpage/gaoptout?hl=de</a>. Das
                Browser-Add-on zur Deaktivierung von Google Analytics ist mit Chrome, Internet Explorer 8 bis 11, Safari, Firefox und
                Opera kompatibel.</p>
              <p>Weitere Informationen zu Nutzungsbedingungen und Datenschutz finden Sie unter folgenden Links: <a target="_blank" rel="noreferrer"
                href="http://www.google.com/analytics/terms/de.html">http://www.google.com/analytics/terms/de.html</a> und <a
                  target="_blank" rel="noreferrer" href="https://www.google.de/intl/de/policies/">https://www.google.de/intl/de/policies/</a>.</p>
              <p>&nbsp;</p>
              <p><strong>Disclaimer (Haftungsausschluss)</strong></p>
              <p><strong>1. Haftung für Inhalte</strong></p>
              <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
                allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
                forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung
                von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist
                jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von
                entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>
              <p><strong>2. Haftung für Links</strong></p>
              <p>Diese Website enthält Links zu externen Webseiten Dritter, auf deren Inhalte kein Einfluss genommen werden kann.
                Deshalb kann für diese fremden Inhalte auch keine Gewähr übernommen werden. Für die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden
                zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren
                zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne
                konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden derartige
                Links umgehend von dieser Website auf die rechtsverletzende Site entfernen.</p>
              <p><strong>3. Urheberrecht</strong></p>
              <p>Die durch die Diensteanbieter, deren Mitarbeiter und beauftragte Dritte erstellten Inhalte und Werke auf diesen Seiten
                unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung
                außerhalb der Grenzen des Urheberrechtes bedürfen der vorherigen schriftlichen Zustimmung des jeweiligen Autors
                bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch
                gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter
                beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
                Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von
                Rechtsverletzungen werden derartige Inhalte umgehend entfernen.</p>
              <p>&nbsp;</p>
              <p>Dieses Impressum wurde mit Hilfe des <a target="_blank" rel="noreferrer"
                href="http://www.hensche.de/impressum-generator.html">Impressum-Generators</a> von <a target="_blank" rel="noreferrer"
                  href="http://www.hensche.de/Rechtsanwalt_Arbeitsrecht_Koeln.html">HENSCHE Rechtsanwälte, Köln </a>
                erstellt.</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeImpressum}>
                Close
              </Button>

            </Modal.Footer>
          </Modal>
        </footer>
      </Container>
      <CookieConsent
        location="bottom"
        buttonText="Sure man!!"
        cookieName="myAwesomeCookieName2"
        style={{ background: "#2B373B" }}
        buttonStyle={{ color: "#4e503b", fontSize: "13px" }}
        expires={150}
      >
      </CookieConsent>
    </div>

  );
}

const createEventFromDate = (startDate, endDate, title, desc, game) => {
  return {
    'summary': title,
    'location': 'Twitch',
    'description': `${desc} - ${game}`,
    'start': {
      'dateTime': startDate.toISOString(),
      'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    'end': {
      'dateTime': endDate.toISOString(),
      'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    'recurrence': [
      'RRULE:FREQ=WEEKLY;COUNT=10'
    ],
    'attendees': [
      { 'email': window.gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail() },

    ],
    'reminders': {
      'useDefault': true,
      'overrides': [

      ]
    }
  }
}


export default App;
