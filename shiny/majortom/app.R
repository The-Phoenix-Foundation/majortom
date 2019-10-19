#

library(shiny)
library(tidyverse)
library(glue)
library(ggradar)

satcat <- read_csv("~/space/majortom/shiny/majortom/satcat_meta.csv")

ui <- fluidPage(

    # Application title
    titlePanel("Satellites"),

    sidebarLayout(
        sidebarPanel(
            selectInput("name", "Choose satellite", choices = satcat$X4, selected = "HST")
        ),

        mainPanel(
           plotOutput("classRadar"),
           plotOutput("launchDate")
#           htmlOutput("picture")
        )
    )
)

server <- function(input, output) {

    output$classRadar <- renderPlot({
        
        curr_sat <- satcat %>% filter(X4 == input$name) %>% select(4,15:19)
        
        ggradar(curr_sat,
                axis.labels = c("Weather & Earth","Scientific","Communications","Navigation","Misc"),
                grid.label.size=0,
                grid.line.width=0,
                group.point.size = 0,
                gridline.mid.colour = "black",
                axis.line.colour = "black")
    })
    output$launchDate <- renderPlot({
        
        time <- satcat_meta %>%
            filter(X4 == input$name) %>% 
            select(4,6,8)
        
        time %>% ggplot(.,aes(x=year(X6),y=0, colour=X4)) +
            theme_classic() +
            geom_hline(yintercept=0, color = "black", size=0.3) +
            geom_segment(aes(y=year(X6),yend=0,xend=year(X6)), color='black', size=0.2) +
            geom_label(aes(y=year(X6),label=date(X6)),color="black") +
            xlim(1970,year(now())) +
            geom_point(aes(y=0), size=3) +
            theme(axis.line.y=element_blank(),
                  axis.text.y=element_blank(),
                  axis.title.x=element_blank(),
                  axis.title.y=element_blank(),
                  axis.ticks.y=element_blank(),
                  axis.ticks.x =element_blank(),
                  axis.line.x =element_blank(),
                  legend.position = "bottom",
                  legend.title = element_blank()
            ) +
            ggtitle("Launch Date")
    })
    output$img <- renderImage({
    })
    output$picture <- renderText({
        data <- satcat %>% filter(X4 == input$name)
        src = "https://nasa3d.arc.nasa.gov/shared_assets/models/acrimsat/acrimsat-428-321.png"
        c('<img src="',src,'">')
#        print(src)
        print(glue("Origin: {data$X5}"))
        print(glue("Launch Date: {data$X6}"))
    })    
}

# Run the application 
shinyApp(ui = ui, server = server)
