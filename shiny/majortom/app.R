#

library(shiny)
library(tidyverse)
library(lubridate)
library(glue)
library(ggradar)

#csv_path <- Sys.getenv(c("SATCAT_CSV"))
cat('using metadata path', csv_path)

satcat <- read_csv(csv_path)

ui <- fluidPage(
    verticalLayout(
    tabsetPanel(
        tabPanel("Satellite",
            uiOutput("selector", height=640, width=480),
            plotOutput("orbitTime", height=640, width=480)
            ),
        tabPanel("Function",
            plotOutput("classRadar", height=640, width=480),
            ),
        tabPanel("Launch Date",
           plotOutput("launchDate", height=640, width=480)
           ),
        tabPanel("Information",
           tableOutput("infotable")
           )
        )
    )
)

server <- function(input, output, session) {
    output$selector <- renderUI({
        catalog_number <- parseQueryString(session$clientData$url_search)
        if ( length(catalog_number) > 0) {
            selection <- catalog_number
        } else {
            selection <- 40697 # SENTINEL-2A
        }
        selectInput("name", "Name", choices = satcat$X4, selected = satcat$X4[satcat$X2==selection])
    })
    output$classRadar <- renderPlot({
        curr_sat <- satcat %>% filter(X4 == input$name) %>% select(4,15:19)
        ggradar(curr_sat,
                axis.labels = c("Weather & Earth","Scientific","Communications","Navigation","Misc"),
                grid.label.size=0,
                grid.line.width=0,
                group.point.size = 0,
                gridline.mid.colour = "black",
                axis.line.colour = "black") + theme(legend.position = "bottom")
    })
    output$launchDate <- renderPlot({
        
        time <- satcat %>%
            filter(X4 == input$name) %>% 
            select(4,6,8)
        
        time %>% ggplot(.,aes(x=year(X6),y=0, colour=X4)) +
            theme_classic() +
            geom_hline(yintercept=0, color = "black", size=0.3) +
            geom_segment(aes(y=1,yend=0,xend=year(X6)), color='black', size=1) +
            geom_label(aes(y=1,label=date(X6)),color="black") +
            xlim(1950,year(now())) +
            geom_point(aes(y=0), size=3) +
            theme(axis.line.y=element_blank(),
                  axis.text.y=element_blank(),
                  axis.title.x=element_blank(),
                  axis.title.y=element_blank(),
                  axis.ticks.y=element_blank(),
                  axis.ticks.x =element_blank(),
                  axis.line.x =element_blank(),
                  axis.text.x = element_text(size=15),
                  legend.text = element_text(size=15),
                  legend.position = "bottom",
                  legend.title = element_blank()
            )
    })
    output$infotable <- renderTable({
        info <- satcat %>%
            filter(X4 == input$name) %>% 
            select(Owner=5,
                   `International Identifier`=1,
                   `NORAD Catalog Number`=2,
                   Name=4,
                   `Orbital period [min]`=9,
                   `Inclination [deg]`=10) %>% 
            gather()
    }, colnames=FALSE)    
    output$orbitTime <- renderPlot({
        satcat %>% 
            mutate(dummy=1) %>% 
            ggplot() + 
            geom_point(aes(x=as.factor(dummy),y=X9),colour="black",alpha=0.3, size=5) + 
            geom_point(data = {. %>% filter(X4==input$name)}, aes(x=as.factor(dummy),y=X9),colour="red", size=10) +
            geom_label(data = {. %>% filter(X4==input$name)}, aes(x=as.factor(dummy),y=X9,label=X4),nudge_x=0.15) +
            theme_minimal() + 
            theme(legend.position = "None",
                  axis.title.x = element_blank(),
                  axis.text.x = element_blank(),
                  axis.text.y = element_text(size=12),
                  axis.title.y = element_text(size=15)) + 
            ylab("Orbital time [min]")
    })
}

# Run the application 
shinyApp(ui = ui, server = server, options = list(port=5777, host='0.0.0.0'))
