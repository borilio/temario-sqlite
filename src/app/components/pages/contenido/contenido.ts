import { Component, ElementRef, HostListener, OnInit, Renderer2, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { CodeHeader } from '../../layout/code-header/code-header'; // Componente code-header (cabecera para los bloques de código)
import { PRIMENG_IMPORTS } from '../../../shared/primeng.imports';
import { MarkdownService } from '../../../services/markdown.service';
import { MenuItem, MessageService, PrimeIcons } from 'primeng/api';
import { Image } from 'primeng/image';

// Importamos DomSanitizer para evitar que Angular elimine los estilos
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TemarioService } from '../../../services/temario.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../../services/config.service';
import { Tema } from '../../../models/temario.model';

@Component({
  selector: 'app-contenido',
  imports: [PRIMENG_IMPORTS],
  providers: [MessageService],
  templateUrl: './contenido.html',
  styleUrls: [
    './contenido.css',     // estilos del componente
    './contenido-md.css',  // estilos sobrescritos para el markdown
    './widgets.css'        // estilos de los widgets
  ],
  encapsulation: ViewEncapsulation.None //Es para aplicar los estilos de forma "global", no me gusta, pero parece que no había otra forma
})
export class Contenido implements OnInit {
  public contenidoHTML: SafeHtml;
  public cargandoContenido: boolean;
  public hayError: boolean;
  public fraseCargando: string = "Cargando contenidos..."; // Se cambia por una al azar en el constructor
  private routeSuscripcion!: Subscription; // Para estar al corriente de los cambios que se hacen de url

  // Para la navegación, tener info del tema actual, siguiente y anterior
  public temaActual: Tema | undefined;
  public temaSiguiente: Tema | null = null;
  public temaAnterior: Tema | null = null;

  // TOC
  public mostrarDrawer: boolean; // Para mostrar el menú lateral con el TOC
  public tocHTML: SafeHtml;
  public anclasTocArregladas: boolean; // Las anclas del TOC se arreglan una vez, en el drawer onShow.

  // SpeedDial
  public speedDialItems: MenuItem[] = []; // Propiedad para los items del Speed Dial

  constructor(
    private markdownService: MarkdownService,
    private messageService: MessageService,
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef,
    private renderer: Renderer2,
    private viewContainerRef: ViewContainerRef,
    // Para la navegación dinámica...
    private temarioService: TemarioService,
    private route: ActivatedRoute,
    private router: Router,
    // Para la configuración...
    public configService: ConfigService //Tiene que ser público, para poder usarlo desde HTML

  ) {
    this.contenidoHTML = "";
    this.tocHTML = "";
    this.cargandoContenido = true;
    this.hayError = false;
    this.mostrarDrawer = false;
    this.anclasTocArregladas = false;
    
    // Inicializamos el array con frases aleatorias 
    this.fraseCargando = this.elegirFrase();

  }

  ngOnInit(): void {


    // Nos suscribimos a los cambios de URL
    this.routeSuscripcion = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        // Guarda el tema actual, siguiente y anterior (para la navegación y cabecera)
        this.temaActual = this.temarioService.getTemaById(id);
        this.temaAnterior = this.temarioService.getTemaAnterior(id);
        this.temaSiguiente = this.temarioService.getTemaSiguiente(id);

        // Cargamos el contenido md de la id del tema que tenemos en la url
        this.cargarContenidoDelTema(id);
      }
    });

    // Inicializamos los elementos del speeddial
    this.speedDialItems = [
      {
        icon: PrimeIcons.LIST,
        label: "Índice (control+i) ",
        command: () => {
          this.abrirDrawer();
        }
      },
      {
        icon: PrimeIcons.ANGLE_DOUBLE_LEFT,
        label: "Anterior",
        command: () => {
          this.irAnterior();
        }
      },
      {
        icon: PrimeIcons.ANGLE_DOUBLE_RIGHT,
        label: "Siguiente",
        command: () => {
          this.irSiguiente();
        }
      }
    ];
  }

  /**
   * Método que retorna una frase de inicialización de contenidos al azar
   * @returns string aleatorio que se mostrará al cargar el contenido
   */
  private elegirFrase(): string {
    const frases: string[] = [
      "Cargando contenidos...",
      "Descargando conocimientos...",
      "Compilando apuntes...",
      "Afinando píxeles educativos...",
      "Despertando a los servidores...",
      "Preparando café para el procesador ☕",
      "Buscando el punto y coma perdido...",
      "Ordenando bits y bytes...",
      "Conectando cables imaginarios...",
      "Actualizando neuronas digitales...",
      "Encendiendo el modo estudiante...",
      "Instalando sabiduría...",
      "Cifrando conocimiento...",
      "Desfragmentando ideas...",
      "Puliendo ejercicios prácticos...",
      "Abriendo la caja de herramientas...",
      "Sincronizando competencias digitales...",
      "Convenciendo al WiFi de colaborar...",
      "Preparando comandos secretos...",
      "Reiniciando la creatividad...",
      "Cargando toneladas de informática...",
      "Ejecutando scripts educativos...",
      "Limpiando el polvo del teclado...",
      "Calibrando el ratón...",
      "Invocando a los dioses del CSS...",
      "Convirtiendo café en contenido...",
      "Recopilando conocimientos ancestrales...",
      "Escaneando memes educativos...",
      "Formateando la paciencia...",
      "Subiendo de nivel académico..."
    ];

    const indice = Math.floor(Math.random() * frases.length);
    return frases[indice];
  }

  /**
   * Método que inicia la acción de abrir el drawer para mostrar el TOC
   */
  public abrirDrawer() {
    //Si tiene TOC abrimos el drawer, si no mostramos el toast
    if (this.tocHTML) {
      this.mostrarDrawer = true;
    } else {
      this.messageService.add({
        severity: "info",
        summary: "Sin índice",
        detail: "Este contenido no tiene índices",
        life: 4000
      });
    }
  }

  /**
   * Método que inicia la acción de ir al siguiente contenido
   */
  public irSiguiente() {
    if (this.temaSiguiente) {
      this.router.navigate(["/tema/", this.temaSiguiente.id]);
    }
  }

  /**
   * Método que inicia la acción de ir al anterior contenido
   */
  public irAnterior() {
    if (this.temaAnterior) {
      this.router.navigate(["/tema/", this.temaAnterior.id]);
    }
  }

  // Vuelca el contenido HTML según la id de un tema recibido
  private cargarContenidoDelTema(id: string) {
    // Vamos a cargar contenido, por lo que iniciamos la animación de carga...
    this.cargandoContenido = true;
    this.hayError = false;
    this.anclasTocArregladas = false; // Para que se vuelva a arreglar las anclas del nuevo contenido

    // Obtenemos el nombre del archivo md que tenemos que cargar
    const archivoMd = this.temarioService.getTemaById(id)?.archivoMd;

    // Si no se pudo obtener un nombre de archivo.md válido, nos vamos de la función,
    // y no intentamos convertir nada a json. Esto solo pasa si ponen manualmente una url no válida
    if (!archivoMd) {
      this.hayError = true;
      this.cargandoContenido = false;
      //
      return;
    }
    const urlCompleta = `assets/temario/${archivoMd}`;
    console.log("Mostrando el archivo", urlCompleta);

    // Convertimos el md a HTML
    this.markdownService.convertirMarkdownHTML(urlCompleta)
      .then(html => {
        // Guarda el html convertido en el atributo this.contenidoHTML
        // En el html, usamos la propiedad innerHTML del elemento contenedor para rellenar el contenido.
        // Pero primero sanitizamos el html resultante de forma segura (para que no nos quite etiquetas style)
        this.contenidoHTML = this.sanitizer.bypassSecurityTrustHtml(html);
        this.hayError = false;
        this.cargandoContenido = false;

        // Aunque creas que no hace falta, setTimeout(..., 0) es el paso que garantiza que tu código de manipulación del DOM se ejecute después de que el navegador haya tenido la oportunidad de renderizarlo.
        setTimeout(() => {
          this.mejorarBloquesDeCodigo(); // Mejora los bloques de código del HTML generado original
          this.extraerTocParaDrawer(); // Extrae el TOC y lo coloca en el drawer lateral
          this.transformarImagenesPreview();
        }, 0);

      })
      .catch(error => {
        // Si hay algún error, mostramos info detallada por consola, un toast y el hayError a true, para que no se muestre la barra de progreso
        console.error("Error al parsear el archivo md a html", error);
        this.hayError = true;
        this.cargandoContenido = false;
        this.messageService.add(
          {
            sticky: true,
            severity: "error",
            summary: "Error",
            detail: "No se pudo convertir el contenido a HTML. Probablemente haya un error en el archivo temario.json. \n\nMás info en consola.",
          }
        );
      }
      );
  }

  /**
   * Función que crea un div que envuelve a los bloques de código y le añade el componente code-header 
   * (una cabecera con una etiqueta con el nombre del lenguaje y un botón para copiar al portapapeles.
   */
  private mejorarBloquesDeCodigo(): void {
    const preElements: NodeListOf<HTMLElement> = this.elementRef.nativeElement.querySelectorAll('.markdown-body pre');

    preElements.forEach(pre => {
      const code = pre.querySelector('code');
      if (!code || pre.parentElement?.classList.contains('code-block-wrapper')) {
        return;
      }

      const componentRef = this.viewContainerRef.createComponent(CodeHeader);
      const languageClass = Array.from(code.classList).find(c => c.startsWith('language-'));
      componentRef.instance.lenguaje = languageClass ? languageClass.replace('language-', '') : 'shell';
      componentRef.instance.codeToCopy = code.innerText;

      const wrapper = this.renderer.createElement('div');
      this.renderer.addClass(wrapper, 'code-block-wrapper');

      const headerHost = this.renderer.createElement('div');
      this.renderer.addClass(headerHost, 'code-block-header'); // Añadimos la clase aquí
      this.renderer.appendChild(headerHost, componentRef.location.nativeElement);

      this.renderer.insertBefore(pre.parentNode, wrapper, pre);
      this.renderer.appendChild(wrapper, headerHost);
      this.renderer.appendChild(wrapper, pre);
    });
  }


  // Función que corrige todos los enlaces del TOC (haciendo magia)
  // Esta función se llama una sola vez al mostrar el Drawer por primera vez 
  public arreglarAnclas(): void {
    // Si ya lo hemos hecho, no hacemos nada más y nos vamos de la función.
    if (this.anclasTocArregladas) {
      return;
    }

    // Obtenemos la ruta actual de la página (ej: /tema/01-word) para añadirla al href y que no queden raros los enlaces (aunque no naveguen a esa ruta)
    const pathActual = window.location.pathname;

    // Buscamos TODOS los enlaces que haya en el TOC (tanto en drawer como en contenido...)
    const enlacesDelIndice: NodeListOf<HTMLAnchorElement> = document.querySelectorAll('.table-of-contents a');

    enlacesDelIndice.forEach(enlace => {

      // Corregimos el href para que el navegador muestre la URL correcta al pasar el ratón
      const fragmento = enlace.getAttribute('href');
      if (fragmento) {
        const urlCorrecta = pathActual + fragmento;
        this.renderer.setAttribute(enlace, 'href', urlCorrecta);
      }

      // Interceptamos los enlaces y evitamos que al hacer click navegue a donde dice su href
      this.renderer.listen(enlace, 'click', (event) => {
        event.preventDefault(); // Evitamos que el router navegue

        const href = (event.currentTarget as HTMLAnchorElement).getAttribute('href');
        if (!href) return;

        // Quitamos el '#' para obtener el ID limpio (aunque esté codificado)
        const idDelElemento = href.substring(href.lastIndexOf('#') + 1);

        // getElementById es el método más fiable para buscar, incluso con IDs codificados
        const elementoDestino = document.getElementById(idDelElemento);

        if (elementoDestino) {
          elementoDestino.scrollIntoView({ behavior: 'smooth', block: 'start' });
          this.mostrarDrawer = false; // Ocultamos el drawer al hacer click en algún enlace
        } else {
          // Este error ahora será muy útil para depurar si algo sigue fallando
          console.error(`Error definitivo: No se pudo encontrar el elemento con id: '${idDelElemento}'`);
        }
      });
    });

    // Una vez arregladas las anclas del TOC, ponemos a true para no volver a hacerlo
    this.anclasTocArregladas = true;
  }

  // Función que extrae el TOC del HTML ya generado y arreglado y lo coloca en el drawer lateral
  private extraerTocParaDrawer(): void {
    // Busca el índice que ya está en la página
    const tocOriginal = this.elementRef.nativeElement.querySelector('.markdown-body .table-of-contents');

    // Si existe el TOC en el contenido lo asignamos a la variable que se mostrará en el drawer
    if (tocOriginal) {
      // Copia su HTML y lo asigna a la variable del drawer
      this.tocHTML = this.sanitizer.bypassSecurityTrustHtml(tocOriginal.innerHTML);
    } else {
      this.tocHTML = ""; // Limpiamos por si había restos de un TOC anterior cacheado
      console.warn("No hay TOC en el md, o bien hubo algún error al extraerlo");
    }
  }

  /**
   * Busca imágenes marcadas y las reemplaza por p-image con preview
   */
  private transformarImagenesPreview(): void {
    // Buscamos todas las imágenes que tengan la clase img-preview
    const imagesToTransform: NodeListOf<HTMLImageElement> =
      this.elementRef.nativeElement.querySelectorAll('img.img-preview');

    // Sustituimos todos los img.img-preview por p-image.
    imagesToTransform.forEach(imgElement => {
      // Crea una instancia del componente p-image
      const componentRef = this.viewContainerRef.createComponent(Image);

      // Pasa las propiedades del <img> original al nuevo componente
      componentRef.instance.src = imgElement.src;
      componentRef.instance.alt = imgElement.alt;
      componentRef.instance.preview = true;

      // Reemplaza el <img> del DOM por el nuevo componente <p-image>
      imgElement.parentNode?.replaceChild(componentRef.location.nativeElement, imgElement);
    });
  }

  /**
   * Método que captura los eventos de teclado al pulsar teclas. Si coincide las teclas pulsadas con nuestra combinación, lanzamos la función que queramos
   * @param evento Evento de teclado que recibe la función
   */
  @HostListener("window:keydown", ["$event"])
  capturarEventoTeclado(evento: KeyboardEvent) {
    // Control + i
    if (evento.ctrlKey && evento.key.toLocaleLowerCase() === 'i') {
      evento.preventDefault();
      this.abrirDrawer();
    }

    // Puedes crear más eventos de teclado

  }


  ngOnDestroy(): void {
    // Limpiamos la suscripción para evitar fugas de memoria
    if (this.routeSuscripcion) {
      this.routeSuscripcion.unsubscribe();
    }
  }

}
