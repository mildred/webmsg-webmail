import './style.css'
import './ui.css'
import 'purecss'
import App from './App.svelte'
import { dayjs } from "svelte-time";
import LocalizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(LocalizedFormat)

const app_div = document.createElement('div')

const app = new App({
  target: app_div,
})

document.body.append(app_div)

export default app
