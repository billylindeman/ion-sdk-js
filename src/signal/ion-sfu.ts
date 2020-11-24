import { v4 as uuidv4 } from 'uuid';
import { Signal } from './';

export default class IonSFUJSONRPCSignal implements Signal {
  protected socket: WebSocket;
  private _onready?: () => void;
  private _onclose?: (ev: Event) => void;
  private _onerror?: (error: Event) => void;
  onnegotiate?: (jsep: RTCSessionDescriptionInit) => void;
  ontrickle?: (candidate: RTCIceCandidateInit) => void;

  constructor(uri: string) {
    this.socket = new WebSocket(uri);

    this.socket.addEventListener('open', () => {
      if (this._onready) this._onready();
    });

    this.socket.addEventListener('error', (e) => {
      if (this._onerror) this._onerror(e);
    });

    this.socket.addEventListener('close', (e) => {
      if (this._onclose) this._onclose(e);
    });

    this.socket.addEventListener('message', async (event) => {
      const resp = JSON.parse(event.data);
      if (resp.method === 'offer') {
        if (this.onnegotiate) this.onnegotiate(resp.params);
      } else if (resp.method === 'trickle') {
        if (this.ontrickle) this.ontrickle(resp.params);
      }
    });
  }

  join(sid: string, offer: RTCSessionDescriptionInit) {
    const id = uuidv4();
    this.socket.send(
      JSON.stringify({
        method: 'join',
        params: { sid, offer },
        id,
      }),
    );

    return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
      const handler = (event: MessageEvent<any>) => {
        const resp = JSON.parse(event.data);
        if (resp.id === id) {
          resolve(resp.result);
        }
        this.socket.removeEventListener('message', handler);
      };
      this.socket.addEventListener('message', handler);
    });
  }

  trickle(candidate: RTCIceCandidateInit) {
    this.socket.send(
      JSON.stringify({
        method: 'trickle',
        params: {
          candidate,
        },
      }),
    );
  }

  pre_offer() {
    const id = uuidv4();
    this.socket.send(
      JSON.stringify({
        method: 'pre_offer',
        params: {},
        id,
      }),
    );

    return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
      const handler = (event: MessageEvent<any>) => {
        const resp = JSON.parse(event.data);
        if (resp.id === id) {
          resolve(resp.result);
        }
        this.socket.removeEventListener('message', handler);
      };
      this.socket.addEventListener('message', handler);
    });
  }

  offer(offer: RTCSessionDescriptionInit) {
    const id = uuidv4();
    this.socket.send(
      JSON.stringify({
        method: 'offer',
        params: { desc: offer },
        id,
      }),
    );

    return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
      const handler = (event: MessageEvent<any>) => {
        const resp = JSON.parse(event.data);
        if (resp.id === id) {
          console.log("response: ", resp);
          if(resp.error) reject(resp.error);
          else resolve(resp.result);
        }
        this.socket.removeEventListener('message', handler);
      };
      this.socket.addEventListener('message', handler);
    });
  }


  answer_ack() {
    const id = uuidv4();
    this.socket.send(
      JSON.stringify({
        method: 'answer_ack',
        params: {},
        id,
      }),
    );

    return new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
      const handler = (event: MessageEvent<any>) => {
        const resp = JSON.parse(event.data);
        if (resp.id === id) {
          resolve(resp.result);
        }
        this.socket.removeEventListener('message', handler);
      };
      this.socket.addEventListener('message', handler);
    });
  }

  answer(answer: RTCSessionDescriptionInit) {
    this.socket.send(
      JSON.stringify({
        method: 'answer',
        params: { desc: answer },
      }),
    );
  }


  close() {
    this.socket.close();
  }

  set onready(onready: () => void) {
    if (this.socket.readyState === WebSocket.OPEN) {
      onready();
    }
    this._onready = onready;
  }
  set onerror(onerror: (error: Event) => void) {
    this._onerror = onerror;
  }
  set onclose(onclose: (ev: Event) => void) {
    this._onclose = onclose;
  }

}
